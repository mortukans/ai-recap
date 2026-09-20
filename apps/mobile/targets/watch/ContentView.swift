import SwiftUI

/// Apple Watch UI (design handoff §6): Sākums → Ieraksta → Saglabāts.
/// Black OLED background, amber accents, red only for the record state.
struct ContentView: View {
  @EnvironmentObject private var link: PhoneLink
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      switch screen {
      case .saved: SavedView(reduceMotion: reduceMotion)
      case .recording: RecordingView(reduceMotion: reduceMotion)
      case .home: HomeView(reduceMotion: reduceMotion)
      }
    }
    .animation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.85), value: screen)
  }

  private enum Screen { case home, recording, saved }

  private var screen: Screen {
    if link.justSaved != nil { return .saved }
    switch link.displayState {
    case .recording, .paused, .finishing: return .recording
    case .idle: return .home
    }
  }
}

// MARK: - Palette

enum WatchPalette {
  static let amber = Color(red: 0.914, green: 0.635, blue: 0.290)      // #E9A24A
  static let red = Color(red: 0.949, green: 0.329, blue: 0.247)        // #F2543F
  static let bone = Color(red: 0.945, green: 0.929, blue: 0.902)       // #F1EDE6
  static let ink = Color(red: 0.082, green: 0.090, blue: 0.106)        // #15171B
  static let surface = Color(red: 0.114, green: 0.125, blue: 0.145)    // #1D2025
  static let surface2 = Color(red: 0.149, green: 0.165, blue: 0.188)   // #262A30
  static let text2 = Color(red: 0.651, green: 0.635, blue: 0.608)      // #A6A29B
  static let onAmber = Color(red: 0.102, green: 0.078, blue: 0.031)    // #1A1408
  static let waveIdle = Color(red: 0.353, green: 0.290, blue: 0.180)   // #5A4A2E
}

/// Brand mark: four amber bars + record dot (64-unit grid).
struct LogoMark: View {
  var size: CGFloat = 14
  var body: some View {
    Canvas { ctx, cg in
      let s = cg.width / 64
      let bars: [(CGFloat, CGFloat, CGFloat)] = [(8, 21, 22), (19, 12, 40), (30, 6, 52), (41, 17, 30)]
      for (x, y, h) in bars {
        let rect = CGRect(x: x * s, y: y * s, width: 6 * s, height: h * s)
        ctx.fill(Path(roundedRect: rect, cornerRadius: 3 * s), with: .color(WatchPalette.amber))
      }
      let dot = CGRect(x: (55 - 3.5) * s, y: (47 - 3.5) * s, width: 7 * s, height: 7 * s)
      ctx.fill(Path(ellipseIn: dot), with: .color(WatchPalette.red))
    }
    .frame(width: size, height: size)
  }
}

// MARK: - Sākums

private struct HomeView: View {
  @EnvironmentObject private var link: PhoneLink
  let reduceMotion: Bool
  @State private var breathe = false

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 6) {
        LogoMark(size: 14)
        Text("Recap").font(.system(size: 17, weight: .medium, design: .serif))
        Spacer()
      }

      Button(action: { link.start() }) {
        HStack(spacing: 10) {
          Circle().fill(Color(red: 1, green: 0.969, blue: 0.961)).frame(width: 20, height: 20)
          Text("Ierakstīt").font(.system(size: 18, weight: .semibold))
            .foregroundStyle(Color(red: 1, green: 0.969, blue: 0.961))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 72)
        .background(WatchPalette.red, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: WatchPalette.red.opacity(0.3), radius: 10, y: 6)
      }
      .buttonStyle(.plain)
      .scaleEffect(breathe ? 1.03 : 1)
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) { breathe = true }
      }
      .accessibilityLabel("Sākt ierakstu")

      if let last = link.lastRecap {
        VStack(alignment: .leading, spacing: 4) {
          Text("Pēdējais · \(last.time)").font(.system(size: 11)).foregroundStyle(WatchPalette.text2)
          Text(last.title.isEmpty ? "Ieraksts" : last.title)
            .font(.system(size: 13, weight: .medium))
            .lineLimit(1)
          HStack(spacing: 6) {
            if last.processing { ProcessingBars() }
            Text(last.statusLabel)
              .font(.system(size: 11, weight: .semibold))
              .foregroundStyle(last.processing ? WatchPalette.amber : WatchPalette.text2)
          }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(WatchPalette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
      } else if let err = link.lastError {
        Text(err).font(.footnote).foregroundStyle(WatchPalette.text2)
      } else if link.uploading {
        HStack(spacing: 6) {
          ProcessingBars()
          Text("Sūta uz iPhone").font(.system(size: 11, weight: .semibold)).foregroundStyle(WatchPalette.amber)
        }
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 4)
  }
}

/// Three amber bars bouncing (processing indicator).
struct ProcessingBars: View {
  @State private var on = false
  var body: some View {
    HStack(spacing: 1.5) {
      ForEach(0..<3, id: \.self) { i in
        RoundedRectangle(cornerRadius: 1)
          .fill(WatchPalette.amber)
          .frame(width: 2, height: 9)
          .scaleEffect(y: on ? 1 : 0.4, anchor: .center)
          .animation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true).delay(Double(i) * 0.2), value: on)
      }
    }
    .frame(height: 9)
    .onAppear { on = true }
  }
}

// MARK: - Ieraksta

private struct RecordingView: View {
  @EnvironmentObject private var link: PhoneLink
  let reduceMotion: Bool
  @State private var dotOn = true

  private var state: RecorderSnapshot.State { link.displayState }
  private var isPaused: Bool { state == .paused }

  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 6) {
        Circle().fill(WatchPalette.red).frame(width: 7, height: 7).opacity(dotOn ? 1 : 0.35)
        Text(isPaused ? "Pauzēts" : "Ieraksta").font(.system(size: 11, weight: .semibold)).foregroundStyle(WatchPalette.red)
      }
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) { dotOn = false }
      }

      Spacer(minLength: 4)

      VStack(spacing: 6) {
        TimelineView(.periodic(from: .now, by: 1)) { context in
          Text(format(link.elapsed(at: context.date)))
            .font(.system(size: 54, weight: .light, design: .serif))
            .monospacedDigit()
            .minimumScaleFactor(0.6)
            .lineLimit(1)
        }
        LiveWaveform(level: state == .recording ? link.level : 0, reduceMotion: reduceMotion)
          .frame(height: 36)
      }

      Spacer(minLength: 4)

      // Pauzēt : Pabeigt = 1 : 1.5, as in the mock.
      GeometryReader { geo in
        let gap: CGFloat = 8
        let unit = (geo.size.width - gap) / 2.5
        HStack(spacing: gap) {
          Button { isPaused ? link.resume() : link.pause() } label: {
            Image(systemName: isPaused ? "play.fill" : "pause.fill")
              .font(.system(size: 18, weight: .semibold))
              .foregroundStyle(WatchPalette.bone)
              .frame(width: unit, height: 48)
              .background(WatchPalette.surface2, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
          }
          .buttonStyle(.plain)
          .disabled(state == .finishing)
          .accessibilityLabel(isPaused ? "Turpināt" : "Pauzēt")

          Button { link.finish() } label: {
            HStack(spacing: 7) {
              Image(systemName: "stop.fill").font(.system(size: 15, weight: .semibold))
              Text("Pabeigt").font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(WatchPalette.ink)
            .frame(width: unit * 1.5, height: 48)
            .background(WatchPalette.bone, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
          }
          .buttonStyle(.plain)
          .disabled(state == .finishing)
          .accessibilityLabel("Pabeigt")
        }
      }
      .frame(height: 48)
    }
    .padding(.horizontal, 4)
  }

  private func format(_ seconds: TimeInterval) -> String {
    let s = Int(seconds)
    return String(format: "%02d:%02d", s / 60, s % 60)
  }
}

/// 24 live bars (3 pt wide, 3 pt gap) driven by the microphone level: the newest sample sits in the
/// middle and older samples fan out to both sides, so speech reads as a moving, symmetric waveform.
struct LiveWaveform: View {
  let level: Double
  let reduceMotion: Bool
  @State private var history: [Double] = Array(repeating: 0.06, count: 12)

  var body: some View {
    GeometryReader { geo in
      let h = geo.size.height
      HStack(spacing: 3) {
        ForEach(0..<24, id: \.self) { i in
          let idx = abs(i - 12)
          let v = idx < history.count ? history[idx] : 0.06
          let alpha = 1.0 - Double(idx) / 16.0
          RoundedRectangle(cornerRadius: 1.5)
            .fill(WatchPalette.amber.opacity(0.35 + 0.65 * alpha))
            .frame(width: 3, height: max(3, h * CGFloat(0.06 + 0.94 * v)))
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .animation(reduceMotion ? nil : .linear(duration: 0.07), value: history)
    }
    .onChange(of: level) { _, l in
      // Perceptual shaping: emphasise speech range, keep a small floor so silence still breathes.
      let shaped = pow(min(1, max(0, l)), 0.7)
      history.insert(max(0.06, shaped), at: 0)
      if history.count > 12 { history.removeLast() }
    }
  }
}

// MARK: - Saglabāts

private struct SavedView: View {
  @EnvironmentObject private var link: PhoneLink
  let reduceMotion: Bool
  @State private var pop = false
  @State private var drawn = false

  var body: some View {
    VStack(spacing: 0) {
      Spacer(minLength: 6)
      ZStack {
        Circle().fill(WatchPalette.amber).frame(width: 48, height: 48)
        CheckShape()
          .trim(from: 0, to: drawn || reduceMotion ? 1 : 0)
          .stroke(WatchPalette.onAmber, style: StrokeStyle(lineWidth: 2.8, lineCap: .round, lineJoin: .round))
          .frame(width: 22, height: 22)
      }
      .scaleEffect(pop || reduceMotion ? 1 : 0.5)
      .opacity(pop || reduceMotion ? 1 : 0)

      VStack(spacing: 3) {
        Text("Saglabāts").font(.system(size: 20, weight: .medium, design: .serif))
        if let saved = link.justSaved {
          Text(saved.subtitle).font(.system(size: 12)).foregroundStyle(WatchPalette.text2)
        }
      }
      .padding(.top, 11)

      HStack(spacing: 5) {
        Image(systemName: "iphone").font(.system(size: 11))
        Text("Kopsavilkums parādīsies iPhone").font(.system(size: 11))
      }
      .foregroundStyle(WatchPalette.text2)
      .padding(.top, 10)

      Spacer(minLength: 6)

      Button { link.dismissSaved() } label: {
        Text("Gatavs").font(.system(size: 14, weight: .semibold))
          .foregroundStyle(WatchPalette.bone)
          .frame(maxWidth: .infinity)
          .frame(height: 44)
          .background(WatchPalette.surface2, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 4)
    .onAppear {
      withAnimation(.spring(response: 0.55, dampingFraction: 0.7)) { pop = true }
      withAnimation(.easeOut(duration: 0.5).delay(0.4)) { drawn = true }
    }
  }
}

private struct CheckShape: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: rect.minX + rect.width * 0.1, y: rect.midY))
    p.addLine(to: CGPoint(x: rect.minX + rect.width * 0.4, y: rect.maxY - rect.height * 0.15))
    p.addLine(to: CGPoint(x: rect.maxX - rect.width * 0.05, y: rect.minY + rect.height * 0.15))
    return p
  }
}
