import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
  Image,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

export default function AdvertisementBanner() {
  const adsToShow = [
    {
      id: "1",
      image: "https://picsum.photos/id/10/400/100",
      link: "https://chatgpt.com",
    },
    {
      id: "2",
      image: "https://picsum.photos/id/20/400/100",
      link: "https://reactnative.dev",
    },
    {
      id: "3",
      image: "https://picsum.photos/id/30/400/100",
      link: "https://www.google.com",
    },
    {
      id: "4",
      image: "https://picsum.photos/id/40/400/100",
      link: "https://www.github.com",
    },
    {
      id: "5",
      image: "https://picsum.photos/id/50/400/100",
      link: "https://about.google",
    },
  ];

  // Clone first and last items for seamless looping
  const loopedAds = [adsToShow[adsToShow.length - 1], ...adsToShow, adsToShow[0]];
  const flatListRef = useRef<FlatList | null>(null);
  const { width } = Dimensions.get("window");
  const adItemWidth = width - 32; // width - (marginHorizontal * 2)
  
  const [activeIndex, setActiveIndex] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    intervalRef.current = setInterval(() => {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }, 5000);
  }, [activeIndex, stopAutoScroll]);

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [startAutoScroll, stopAutoScroll]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / adItemWidth);

    if (newIndex === 0) {
      // Scrolled to the cloned last item at the beginning
      setActiveIndex(adsToShow.length);
      flatListRef.current?.scrollToIndex({ index: adsToShow.length, animated: false });
    } else if (newIndex === loopedAds.length - 1) {
      // Scrolled to the cloned first item at the end
      setActiveIndex(1);
      flatListRef.current?.scrollToIndex({ index: 1, animated: false });
    } else {
      setActiveIndex(newIndex);
    }
  };

  const handlePress = (link: string) => {
    if (link) {
      Linking.openURL(link).catch((err) =>
        console.error("Failed to open URL:", err)
      );
    }
  };

  const renderItem = ({ item }: { item: typeof adsToShow[0] }) => (
    <TouchableOpacity
      onPress={() => handlePress(item.link)}
      activeOpacity={0.9}
      style={{ width: adItemWidth }}
    >
      <Image source={{ uri: item.image }} style={styles.adImage} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={loopedAds}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={stopAutoScroll}
        onScrollEndDrag={startAutoScroll}
        initialScrollIndex={1}
        getItemLayout={(_, index) => ({
            length: adItemWidth,
            offset: adItemWidth * index,
            index,
        })}
        style={styles.adBox}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    marginVertical: 8,
  },
  adBox: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e0e0e0",
  },
  adImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 12,
  },
});