import Foundation
import Speech

/// On-device (with server fallback) speech-to-text for a single audio file, via Apple's Speech
/// framework (AI_RECAP_TECHNICAL_ARCHITECTURE.md §10, Product Plan §7 Option C).
/// Returns the transcript text; the JS layer places it on the timeline using chunk metadata.
enum SpeechTranscription {
  enum SpeechError: Error { case notAuthorized, unavailable }

  static func requestAuthorization() async -> Bool {
    await withCheckedContinuation { cont in
      SFSpeechRecognizer.requestAuthorization { status in
        cont.resume(returning: status == .authorized)
      }
    }
  }

  /// Transcribe a local audio file. Tries `localeId`, falls back to en-US if unsupported.
  static func transcribeFile(url: URL, localeId: String) async throws -> String {
    guard await requestAuthorization() else { throw SpeechError.notAuthorized }

    let recognizer =
      SFSpeechRecognizer(locale: Locale(identifier: localeId))
      ?? SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    guard let recognizer, recognizer.isAvailable else { throw SpeechError.unavailable }

    let request = SFSpeechURLRecognitionRequest(url: url)
    request.shouldReportPartialResults = false
    if recognizer.supportsOnDeviceRecognition {
      request.requiresOnDeviceRecognition = true // privacy: keep audio on device when possible
    }

    return try await withCheckedThrowingContinuation { cont in
      var finished = false
      recognizer.recognitionTask(with: request) { result, error in
        if finished { return }
        if let error {
          finished = true
          cont.resume(throwing: error)
          return
        }
        guard let result, result.isFinal else { return }
        finished = true
        cont.resume(returning: result.bestTranscription.formattedString)
      }
    }
  }
}
