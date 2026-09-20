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
