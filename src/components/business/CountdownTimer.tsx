import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

type CountdownTimerProps = {
  seconds: number;
  label?: string;
  onExpire?: () => void;
};

export function CountdownTimer({ seconds, label = 'ETA', onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const display = remaining > 0 ? `${m}:${s.toString().padStart(2, '0')}` : '0:00';

  return (
    <View className="rounded-2xl bg-[#ffe9e6] px-4 py-3">
      <Text className="text-xs font-semibold uppercase text-[#59413d]">{label}</Text>
      <Text className="mt-1 text-xl font-bold text-[#720003]">{display}</Text>
    </View>
  );
}
