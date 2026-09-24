import AVFoundation
import Foundation

/// Splits one long audio file into consecutive ≤ `maxSeconds` parts (AAC .m4a), next to the source.
/// Used for Apple Watch recordings, which arrive as a single file, so the transcription pipeline sees
/// the same ≤ 60 s chunks the phone recorder produces (one model request per chunk).
enum AudioSplitter {
  struct Part {
    let url: URL
    let duration: Double
    let byteSize: Int
  }

  static func split(url: URL, maxSeconds: Double) async throws -> [Part] {
    let asset = AVURLAsset(url: url)
    let total = CMTimeGetSeconds(try await asset.load(.duration))
    guard total.isFinite, total > 0 else { return [] }
    let step = max(5, maxSeconds)
    let count = Int(ceil(total / step))
    guard count > 1 else { return [] }

    let dir = url.deletingLastPathComponent()
    let base = url.deletingPathExtension().lastPathComponent
    var parts: [Part] = []
    for i in 0..<count {
      let start = Double(i) * step
      let length = min(step, total - start)
      guard length > 0.05 else { break }
      let out = dir.appendingPathComponent(String(format: "%@_p%02d.m4a", base, i + 1))
      if FileManager.default.fileExists(atPath: out.path) { try? FileManager.default.removeItem(at: out) }

      guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else {
        throw NSError(domain: "AudioSplitter", code: 1, userInfo: [NSLocalizedDescriptionKey: "Export session unavailable"])
      }
      session.outputURL = out
      session.outputFileType = .m4a
      session.timeRange = CMTimeRange(
        start: CMTime(seconds: start, preferredTimescale: 600),
        duration: CMTime(seconds: length, preferredTimescale: 600))
      await session.export()
      if let error = session.error { throw error }
      guard session.status == .completed else {
        throw NSError(domain: "AudioSplitter", code: 2, userInfo: [NSLocalizedDescriptionKey: "Export failed (status \(session.status.rawValue))"])
      }
      let exported = CMTimeGetSeconds(try await AVURLAsset(url: out).load(.duration))
      let size = ((try? FileManager.default.attributesOfItem(atPath: out.path))?[.size] as? Int) ?? 0
      parts.append(Part(url: out, duration: exported.isFinite && exported > 0 ? exported : length, byteSize: size))
    }
    return parts
  }
}
