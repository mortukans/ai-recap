import AVFoundation
import ExpoModulesCore

/// Expo module bridge for the chunked background recorder.
/// Registered as "AiRecapRecorder" (see expo-module.config.json).
/// See AI_RECAP_TECHNICAL_ARCHITECTURE.md §7.2.
public class RecorderModule: Module {
  private let engine = RecordingEngine()

  public func definition() -> ModuleDefinition {
    Name("AiRecapRecorder")

    Events("duration", "chunkClosed", "interrupted", "resumed", "error", "watchCommand", "watchRecordingReceived")

    OnCreate {
      self.engine.onEvent = { [weak self] name, payload in
        self?.sendEvent(name, payload)
      }
      // Apple Watch remote control: commands arrive here and are forwarded to JS.
      WatchBridge.shared.onCommand = { [weak self] command in
        self?.sendEvent("watchCommand", ["command": command])
      }
      WatchBridge.shared.onWatchRecording = { [weak self] payload in
        self?.sendEvent("watchRecordingReceived", payload)
      }
      WatchBridge.shared.activate()
    }

    /// Mirror recorder state (+ whether the app is foregrounded) to the watch.
    AsyncFunction("setWatchState") { (state: String, startedAt: Double, pausedElapsed: Double, phoneActive: Bool) in
      WatchBridge.shared.publish(state: state, startedAt: startedAt, pausedElapsed: pausedElapsed, phoneActive: phoneActive)
    }

    /// Share formatted text (HTML → NSAttributedString) through the system share sheet so Apple Notes,
    /// Mail and Messages paste headings, lists and checkboxes instead of raw Markdown.
    AsyncFunction("shareRichText") { (html: String, plain: String, promise: Promise) in
      guard let data = html.data(using: .utf8),
            let attributed = try? NSAttributedString(
              data: data,
              options: [.documentType: NSAttributedString.DocumentType.html, .characterEncoding: String.Encoding.utf8.rawValue],
              documentAttributes: nil
            ),
            let controller = self.appContext?.utilities?.currentViewController()
      else {
        promise.reject("ERR_SHARE", "Could not prepare rich text")
        return
      }
      let sheet = UIActivityViewController(activityItems: [RichTextItem(attributed: attributed, plain: plain)], applicationActivities: nil)
      sheet.completionWithItemsHandler = { _, _, _, _ in promise.resolve(nil) }
      if let pop = sheet.popoverPresentationController {
        pop.sourceView = controller.view
        pop.sourceRect = CGRect(x: controller.view.bounds.midX, y: controller.view.bounds.maxY - 40, width: 1, height: 1)
      }
      controller.present(sheet, animated: true)
    }.runOnQueue(.main)

    /// Latest recap (title / status / start ms) for the watch home card.
    AsyncFunction("setWatchLastRecap") { (title: String, status: String, startedAt: Double) in
      WatchBridge.shared.publishLastRecap(title: title, status: status, startedAt: startedAt)
    }

    OnDestroy {
      self.engine.teardown()
    }

    AsyncFunction("requestPermission") { () -> Bool in
      return await RecordingEngine.requestPermission()
    }

    AsyncFunction("getPermissionStatus") { () -> String in
      return RecordingEngine.permissionStatus()
    }

    AsyncFunction("start") { (recapId: String, chunkSeconds: Double, sampleRate: Double) in
      try self.engine.start(recapId: recapId, chunkSeconds: chunkSeconds, sampleRate: sampleRate)
    }

    AsyncFunction("pause") {
      try self.engine.pause()
    }

    AsyncFunction("resume") {
      try self.engine.resume()
    }

    AsyncFunction("finish") { () -> [String: Any] in
      let result = try self.engine.finish()
      return ["durationSeconds": result.durationSeconds, "chunkCount": result.chunkCount]
    }

    AsyncFunction("addMarker") { (label: String?) in
      self.engine.addMarker(label: label)
    }

    AsyncFunction("transcribeFile") { (uri: String, locale: String) -> String in
      guard let url = URL(string: uri) else { return "" }
      return try await SpeechTranscription.transcribeFile(url: url, localeId: locale)
    }
  }
}

/// Activity item that offers rich text to apps that take it (Notes, Mail) and plain text to the rest.
final class RichTextItem: NSObject, UIActivityItemSource {
  private let attributed: NSAttributedString
  private let plain: String

  init(attributed: NSAttributedString, plain: String) {
    self.attributed = attributed
    self.plain = plain
  }

  func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
    return plain
  }

  func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
    let raw = activityType?.rawValue ?? ""
    if raw.contains("mobilenotes") || raw.contains("Notes") || raw.contains("MobileMail") || raw.contains("Mail") {
      return attributed
    }
    return plain
  }

  func activityViewController(_ activityViewController: UIActivityViewController, subjectForActivityType activityType: UIActivity.ActivityType?) -> String {
    return plain.split(separator: "\n").first.map(String.init) ?? "AI Recap"
  }
}
