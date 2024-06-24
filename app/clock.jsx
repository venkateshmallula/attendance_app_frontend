import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

const Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const screenWidth = Dimensions.get("window").width;
  const clockSize = screenWidth * 0.3; // Adjust clock size here

  const center = clockSize / 2;
  const radius = clockSize * 0.4;
  const hourLength = radius * 0.4;
  const minLength = radius * 0.6;
  const secLength = radius * 0.8;

  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();

  const hourAngle = (hours * 30 + minutes / 2) % 360;
  const minAngle = minutes * 6;
  const secAngle = seconds * 6;

  const formattedTime = `${hours < 10 ? "0" + hours : hours}:${
    minutes < 10 ? "0" + minutes : minutes
  }:${seconds < 10 ? "0" + seconds : seconds}`;

  return (
    <View style={styles.container}>
      <Svg width={clockSize} height={clockSize}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="black"
          strokeWidth="2"
          fill="none"
        />
        {/* Hour Hand */}
        <Line
          x1={center}
          y1={center}
          x2={center + hourLength * Math.sin((hourAngle * Math.PI) / 180)}
          y2={center - hourLength * Math.cos((hourAngle * Math.PI) / 180)}
          stroke="black"
          strokeWidth="4"
        />
        {/* Minute Hand */}
        <Line
          x1={center}
          y1={center}
          x2={center + minLength * Math.sin((minAngle * Math.PI) / 180)}
          y2={center - minLength * Math.cos((minAngle * Math.PI) / 180)}
          stroke="black"
          strokeWidth="3"
        />
        {/* Second Hand */}
        <Line
          x1={center}
          y1={center}
          x2={center + secLength * Math.sin((secAngle * Math.PI) / 180)}
          y2={center - secLength * Math.cos((secAngle * Math.PI) / 180)}
          stroke="red"
          strokeWidth="2"
        />
        {/* Center Circle */}
        <Circle cx={center} cy={center} r="5" fill="black" />
      </Svg>
      <Text style={styles.digitalTime}>{formattedTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  digitalTime: {
    fontSize: 24,
    marginTop: 10,
  },
});

export default Clock;
