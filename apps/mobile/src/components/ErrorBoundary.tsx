/**
 * Top-level error boundary: catches React render errors anywhere in the tree, reports them
 * (anonymous diagnostics), and shows a calm recovery screen instead of a white/blank crash.
 * Deliberately dependency-light — it uses only React Native primitives, so it can still render even
 * if the design system or a data module is what failed.
 */
import { Component, type ReactNode } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';

import { reportError } from '../lib/crash';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    reportError(error, { fatal: true, context: 'render' });
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) return <Fallback onRetry={this.reset} />;
    return this.props.children;
  }
}

function Fallback({ onRetry }: { onRetry: () => void }) {
  const dark = useColorScheme() === 'dark';
  const bg = dark ? '#15171B' : '#F4F5F7';
  const ink = dark ? '#F1EDE6' : '#16181D';
  const muted = dark ? '#A6A29B' : '#656A73';
  const btnBg = dark ? '#F1EDE6' : '#16181D';
  const btnInk = dark ? '#15171B' : '#FFFFFF';

  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ color: ink, fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 10 }}>Kaut kas nogāja greizi</Text>
      <Text style={{ color: muted, fontSize: 15, lineHeight: 21, textAlign: 'center', marginBottom: 4 }}>
        Radās neparedzēta kļūda. Tavi ieraksti ir droši saglabāti ierīcē.
      </Text>
      <Text style={{ color: muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 28 }}>
        Something went wrong. Your recordings are safe on your device.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={{ height: 50, paddingHorizontal: 28, borderRadius: 25, backgroundColor: btnBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: btnInk, fontSize: 16, fontWeight: '600' }}>Mēģināt vēlreiz · Try again</Text>
      </Pressable>
    </View>
  );
}
