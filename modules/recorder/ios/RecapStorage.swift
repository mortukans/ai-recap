import Foundation

/// On-disk layout for a recap's audio + manifest (AI_RECAP_TECHNICAL_ARCHITECTURE.md §5.3).
///   <AppSupport>/Recaps/<recapId>/manifest.json
///   <AppSupport>/Recaps/<recapId>/chunks/chunk_0001.m4a …
///
/// The Recaps tree uses `.completeUntilFirstUserAuthentication` so writes continue while the device
/// is locked (a locked recording must not stall) yet data is encrypted at rest (§ M1-7).
enum RecapStorage {
  private static let manifestQueue = DispatchQueue(label: "lv.airecap.recorder.manifest")

  static func recapsRoot() throws -> URL {
    let base = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let root = base.appendingPathComponent("Recaps", isDirectory: true)
    try FileManager.default.createDirectory(
      at: root,
      withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
    return root
  }

  static func recapDirectory(for recapId: String) throws -> URL {
    let dir = try recapsRoot().appendingPathComponent(recapId, isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  /// Returns the `chunks/` subdirectory, creating it if needed.
  static func chunkDirectory(for recapId: String) throws -> URL {
    let dir = try recapDirectory(for: recapId).appendingPathComponent("chunks", isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  /// Append a chunk entry to manifest.json, rewriting atomically (temp file + replace).
  static func appendToManifest(
    recapId: String, index: Int, relativePath: String,
    startOffset: Double, duration: Double, byteSize: Int
  ) {
    manifestQueue.async {
      guard let dir = try? recapDirectory(for: recapId) else { return }
      let manifestURL = dir.appendingPathComponent("manifest.json")

      var manifest: [String: Any] = [:]
      if let data = try? Data(contentsOf: manifestURL),
         let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
        manifest = parsed
      }
      manifest["recapId"] = recapId
      var chunks = (manifest["chunks"] as? [[String: Any]]) ?? []
      chunks.append([
        "index": index,
        "relativePath": relativePath,
        "startOffset": startOffset,
        "duration": duration,
        "byteSize": byteSize,
      ])
      manifest["chunks"] = chunks
      manifest["updatedAt"] = Date().timeIntervalSince1970 * 1000

      guard let out = try? JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted]) else { return }
      let tmp = manifestURL.appendingPathExtension("tmp")
      try? out.write(to: tmp, options: .atomic)
      _ = try? FileManager.default.replaceItemAt(manifestURL, withItemAt: tmp)
    }
  }
}
