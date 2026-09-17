import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var link: PhoneLink

  var body: some View {
    VStack(spacing: 10) {
      header
      timer
      controls
      if let err = link.lastError {
        Text(err)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
    }
    .padding(.horizontal, 4)
  }

  private var header: some View {
    HStack(spacing: 6) {
      Circle()
        .fill(link.snapshot.state == .recording ? Color.red : Color.secondary)
        .frame(width: 8, height: 8)
      Text(label)
        .font(.caption2)
        .textCase(.uppercase)
        .foregroundStyle(.secondary)
      Spacer(minLength: 0)
      if !link.reachable {
        Image(systemName: "iphone.slash").font(.caption2).foregroundStyle(.secondary)
      }
    }
  }

  /// Live timer: ticks locally from `startedAt`, frozen while paused, so the phone need not stream.
  private var timer: some View {
    TimelineView(.periodic(from: .now, by: 1)) { context in
      Text(format(elapsed(at: context.date)))
        .font(.system(size: 40, weight: .light, design: .rounded))
        .monospacedDigit()
        .frame(maxWidth: .infinity)
    }
  }

  @ViewBuilder
  private var controls: some View {
    switch link.snapshot.state {
    case .idle, .finishing:
      Button { link.send("start") } label: {
        Label("Record", systemImage: "mic.fill")
          .font(.headline)
          .frame(maxWidth: .infinity)
      }
      .tint(.red)
      .buttonStyle(.borderedProminent)
      .disabled(link.snapshot.state == .finishing)
    case .recording, .paused:
      HStack(spacing: 8) {
        Button {
          link.send(link.snapshot.state == .paused ? "resume" : "pause")
        } label: {
          Image(systemName: link.snapshot.state == .paused ? "play.fill" : "pause.fill")
            .font(.title3)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        Button { link.send("finish") } label: {
          Image(systemName: "stop.fill")
            .font(.title3)
            .frame(maxWidth: .infinity)
        }
        .tint(.red)
        .buttonStyle(.borderedProminent)
      }
    }
  }

  private var label: String {
    switch link.snapshot.state {
    case .idle: return "Ready"
    case .recording: return "Recording"
    case .paused: return "Paused"
    case .finishing: return "Saving"
    }
  }

  private func elapsed(at date: Date) -> TimeInterval {
    switch link.snapshot.state {
    case .recording: return max(0, date.timeIntervalSince1970 - link.snapshot.startedAt)
    case .paused: return link.snapshot.pausedElapsed
    default: return 0
    }
  }

  private func format(_ seconds: TimeInterval) -> String {
    let s = Int(seconds)
    return String(format: "%02d:%02d", s / 60, s % 60)
  }
}
