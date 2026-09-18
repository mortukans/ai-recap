import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var link: PhoneLink

  var body: some View {
    VStack(spacing: 10) {
      header
      timer
      controls
      footer
    }
    .padding(.horizontal, 4)
  }

  private var state: RecorderSnapshot.State { link.displayState }

  private var header: some View {
    HStack(spacing: 6) {
      Circle()
        .fill(state == .recording ? Color.red : Color.secondary)
        .frame(width: 8, height: 8)
      Text(label)
        .font(.caption2)
        .textCase(.uppercase)
        .foregroundStyle(.secondary)
      Spacer(minLength: 0)
      Image(systemName: link.mode == .local && state != .idle ? "applewatch" : "iphone")
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }

  /// Ticks locally; the phone only sends state changes, the watch recorder is read directly.
  private var timer: some View {
    TimelineView(.periodic(from: .now, by: 1)) { context in
      Text(format(link.elapsed(at: context.date)))
        .font(.system(size: 40, weight: .light, design: .rounded))
        .monospacedDigit()
        .frame(maxWidth: .infinity)
    }
  }

  @ViewBuilder
  private var controls: some View {
    switch state {
    case .idle, .finishing:
      Button { link.start() } label: {
        Label("Record", systemImage: "mic.fill")
          .font(.headline)
          .frame(maxWidth: .infinity)
      }
      .tint(.red)
      .buttonStyle(.borderedProminent)
      .disabled(state == .finishing)
    case .recording, .paused:
      HStack(spacing: 8) {
        Button {
          if state == .paused { link.resume() } else { link.pause() }
        } label: {
          Image(systemName: state == .paused ? "play.fill" : "pause.fill")
            .font(.title3)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        Button { link.finish() } label: {
          Image(systemName: "stop.fill")
            .font(.title3)
            .frame(maxWidth: .infinity)
        }
        .tint(.red)
        .buttonStyle(.borderedProminent)
      }
    }
  }

  @ViewBuilder
  private var footer: some View {
    if let err = link.lastError {
      Text(err).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
    } else if link.uploading {
      HStack(spacing: 4) {
        ProgressView().controlSize(.mini)
        Text("Sending to iPhone").font(.footnote).foregroundStyle(.secondary)
      }
    } else if state == .idle {
      Text(link.snapshot.phoneActive ? "Records on iPhone" : "Records on watch")
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
  }

  private var label: String {
    switch state {
    case .idle: return "Ready"
    case .recording: return "Recording"
    case .paused: return "Paused"
    case .finishing: return "Saving"
    }
  }

  private func format(_ seconds: TimeInterval) -> String {
    let s = Int(seconds)
    return String(format: "%02d:%02d", s / 60, s % 60)
  }
}
