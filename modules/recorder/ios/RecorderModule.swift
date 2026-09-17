import AVFoundation
import ExpoModulesCore

/// Expo module bridge for the chunked background recorder.
/// Registered as "AiRecapRecorder" (see expo-module.config.json).
/// See AI_RECAP_TECHNICAL_ARCHITECTURE.md §7.2.
public class RecorderModule: Module {
  private let engine = RecordingEngine()

  public func definition() -> ModuleDefinition {
    Name("AiRecapRecorder")

    Events("duration", "chunkClosed", "interrupted", "resumed", "error")

    OnCreate {
      self.engine.onEvent = { [weak self] name, payload in
        self?.sendEvent(name, payload)
      }
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
