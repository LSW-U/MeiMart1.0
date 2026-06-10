import { ImageBackground, Text, View } from 'react-native';

const mapUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOcyrnzojmZ6zuW-mKlWpMQppmQnnod774MQvovj-7-jU9avpbhflhvH4Ee7kWCuu9paLcIaZPDZJ1mp5Bpi_IYBEVQEzsAdzvddpQJItEdVj1y0eQfKKSSjSFNTqvQLenxpsi2CjiFjudsgfET843nHMopGo3mrS9Jsnjhpz3CkTFx3kCqJ22LsY59Th3M2LEZCs84-OCfy7JdcoXbhS1MPUkA4DeK1cU9RCrQDPv-JSTLhRNkgaKiBZyO7sCNhiUAe2rUp0H9w';

type MapViewProps = {
  pickupLabel: string;
  deliveryLabel: string;
};

export function MapView({ pickupLabel, deliveryLabel }: MapViewProps) {
  return (
    <View className="relative h-[320px] w-full overflow-hidden bg-[#eed4d1]">
      <ImageBackground className="h-full w-full opacity-80" resizeMode="cover" source={{ uri: mapUri }}>
        <View className="absolute left-[30%] top-[25%] items-center">
          <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-[#fff8f7] bg-[#720003] shadow-lg">
            <Text className="font-bold text-white">P</Text>
          </View>
          <Text className="mt-1 rounded-lg border border-[#e1bfba] bg-white px-2 py-1 text-xs font-bold text-[#261816]">{pickupLabel}</Text>
        </View>
        <View className="absolute bottom-[25%] right-[25%] items-center">
          <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-[#fff8f7] bg-[#463200] shadow-lg">
            <Text className="font-bold text-white">D</Text>
          </View>
          <Text className="mt-1 rounded-lg border border-[#e1bfba] bg-white px-2 py-1 text-xs font-bold text-[#261816]">{deliveryLabel}</Text>
        </View>
        <View className="absolute left-[36%] top-[34%] h-32 w-36 rotate-12 border-t-4 border-dashed border-[#720003] opacity-60" />
      </ImageBackground>
      <View className="absolute bottom-0 left-0 h-16 w-full bg-[#fff8f7]/80" />
    </View>
  );
}
