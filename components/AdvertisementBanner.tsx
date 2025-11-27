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
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase"; // adjust the path

interface Ad {
  id: string;
  title?: string;
  image_url: string;
  link: string;
  active: boolean;
}

export default function AdvertisementBanner() {
  const [adsToShow, setAdsToShow] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList | null>(null);
  const { width } = Dimensions.get("window");
  const adItemWidth = width - 32; // width - (marginHorizontal * 2)
  
  const [activeIndex, setActiveIndex] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch ads from Supabase
  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setAdsToShow(data as Ad[]);
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  // Looping mechanism
  const loopedAds = adsToShow.length > 0
    ? [adsToShow[adsToShow.length - 1], ...adsToShow, adsToShow[0]]
    : [];

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
    if (adsToShow.length > 0) startAutoScroll();
    return () => stopAutoScroll();
  }, [adsToShow, startAutoScroll, stopAutoScroll]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / adItemWidth);

    if (newIndex === 0) {
      setActiveIndex(adsToShow.length);
      flatListRef.current?.scrollToIndex({ index: adsToShow.length, animated: false });
    } else if (newIndex === loopedAds.length - 1) {
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

  const renderItem = ({ item }: { item: Ad }) => (
    <TouchableOpacity
      onPress={() => handlePress(item.link)}
      activeOpacity={0.9}
      style={{ width: adItemWidth }}
    >
      <Image source={{ uri: item.image_url }} style={styles.adImage} />
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#1e90ff" style={{ marginVertical: 16 }} />;
  }

  if (adsToShow.length === 0) {
    return null; // no ads to show
  }

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
