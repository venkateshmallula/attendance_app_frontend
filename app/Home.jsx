import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  Button,
  ToastAndroid,
  Image,
  StyleSheet,
  Linking,
  Switch,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Calendar } from "react-native-calendars";
import axios from "axios";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import RealTimeClock from "../app/clock";

const App = () => {
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
  const [timestamp, setTimestamp] = useState(new Date());
  const [checkInMode, setCheckInMode] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [markedDates, setMarkedDates] = useState({});
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState(null);

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      ToastAndroid.show(
        "Permission Denied: Location permission is required to check-in.",
        ToastAndroid.LONG
      );
      return;
    }

    let locationData = await Location.getCurrentPositionAsync({});
    setLocation(locationData.coords);
    setTimestamp(new Date());
    getAddress(locationData.coords.latitude, locationData.coords.longitude);
  };

  const getAddress = async (latitude, longitude) => {
    try {
      let addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (addressResponse.length > 0) {
        const { formattedAddress, city, region, postalCode, country } =
          addressResponse[0];
        const fullAddress = ` ${formattedAddress || ""}, ${city || ""}, ${
          region || ""
        }, ${postalCode || ""}, ${country || ""}`.trim();
        setAddress(fullAddress);
      } else {
        setAddress("Address not found");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setAddress("Error fetching address");
    }
  };

  useEffect(() => {
    getLocation();

    AsyncStorage.getItem("userName").then((value) => {
      if (value) {
        setUserName(value);
      }
    });
    AsyncStorage.getItem("userId").then((value) => {
      if (value) {
        setUserId(value);
      }
    });

    AsyncStorage.getItem("checkInMode").then((value) => {
      if (value !== null) {
        setCheckInMode(JSON.parse(value));
      }
    });
    AsyncStorage.getItem("checkInTime").then((value) => {
      if (value) {
        setCheckInTime(value);
      }
    });
    AsyncStorage.getItem("checkOutTime").then((value) => {
      if (value) {
        setCheckOutTime(value);
      }
    });

    fetchDataFromBackend();
  }, []);

  const fetchDataFromBackend = async () => {
    try {
      const response = await axios.get(
        "https://attendance-app-with-photo.onrender.com/fetch-marked-dates"
      );
      const data = response.data;

      const markedDatesObject = {};
      data.forEach((date) => {
        const formattedDate = new Date(date).toISOString().split("T")[0];
        markedDatesObject[formattedDate] = {
          marked: true,
          dotColor: "transparent",
          selected: true,
          selectedColor: "#98eda2",
        };
      });
      setMarkedDates(markedDatesObject);
    } catch (error) {
      console.error("Error fetching data from backend:", error);
    }
  };

  const [fontsLoaded] = useFonts({
    "Inter-Black": require("../assets/fonts/DancingScript-Regular.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const sendCheckData = async (type) => {
    const currentTimestamp = new Date();
    const localTime = currentTimestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (location && currentTimestamp && photo) {
      const checkData = {
        userId: userId,
        date: currentTimestamp.toISOString().split("T")[0],
        type: type,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        time: localTime,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(checkData));

      const photoUri = photo;
      const fileName = photoUri.split("/").pop();
      const fileType = fileName.split(".").pop();

      formData.append("photo", {
        uri: photoUri,
        name: fileName,
        type: `image/${fileType}`,
      });

      try {
        const response = await axios.post(
          type === "check-in"
            ? "https://attendance-app-with-photo.onrender.com/checkin"
            : "https://attendance-app-with-photo.onrender.com/checkout",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        ToastAndroid.show(`${type} data sent successfully!`, ToastAndroid.LONG);
        setTimestamp(currentTimestamp);

        if (type === "check-in") {
          setCheckInTime(localTime);
          await AsyncStorage.setItem("checkInTime", localTime);
        } else {
          setCheckOutTime(localTime);
          await AsyncStorage.setItem("checkOutTime", localTime);
        }
        setPhoto(null);
        return true; // return true on success
      } catch (error) {
        ToastAndroid.show(
          `Failed to send ${type} data: ${error.message}`,
          ToastAndroid.LONG
        );
        return false; // return false on error
      }
    } else {
      ToastAndroid.show(
        "Location or timestamp or photo is not available",
        ToastAndroid.LONG
      );
      return false; // return false if prerequisites are missing
    }
  };

  const toggleCheckInMode = async (value) => {
    if (photo) {
      if (value) {
        const success = await sendCheckData("check-in");
        if (success) {
          setCheckInMode(value);
          await AsyncStorage.setItem("checkInMode", JSON.stringify(value));
        }
      } else {
        const success = await sendCheckData("check-out");
        if (success) {
          setCheckInMode(value);
          await AsyncStorage.setItem("checkInMode", JSON.stringify(value));
        }
      }
    } else {
      ToastAndroid.show("Take a Selfie First!", ToastAndroid.SHORT);
    }
  };

  const openLocationOnMap = () => {
    if (location) {
      const { latitude, longitude } = location;
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url);
    } else {
      ToastAndroid.show("Location is not available", ToastAndroid.LONG);
    }
  };

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    } else {
      setPhoto(null);
    }
  };

  return (
    <ScrollView>
      <View>
        <LinearGradient
          colors={[
            "rgba(255,255,255,1)",
            "rgba(43,224,228,0.689)",
            "rgba(38,190,221,1)",
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.maincontainer}
        >
          <View style={styles.inlineContainer}>
            <Image
              style={styles.image}
              resizeMode="contain"
              source={{
                uri: "https://piqyu.com/wp-content/uploads/2022/04/PIQYU.png",
              }}
            />
            <Text onLayout={onLayoutRootView} style={styles.headerText}>
              Hello {userName.slice(0, 10)}...👋
            </Text>
          </View>
          <LinearGradient
            colors={[
              "rgba(255,255,255,1)",
              "rgba(43,224,228,0.689)",
              "rgba(38,190,221,1)",
            ]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.container}
          >
            <View>
              <RealTimeClock />
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Check Out</Text>
              <Switch
                value={checkInMode}
                onValueChange={toggleCheckInMode}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={checkInMode ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
              />
              <Text style={styles.switchText}>Check In</Text>
            </View>
            {location && (
              <View>
                <Text style={styles.infoText}>
                  Location: {location.latitude}, {location.longitude}
                </Text>
                <Text style={styles.infoText}>Address: {address}</Text>
              </View>
            )}
            <View style={styles.button}>
              <Button
                title="Open Location on Map"
                onPress={openLocationOnMap}
              />
            </View>
            <View style={styles.button}>
              <Button title="Take Selfie" onPress={takePhoto} />
            </View>
            {photo && <Image source={{ uri: photo }} style={styles.photo} />}
          </LinearGradient>
        </LinearGradient>
        <LinearGradient
          colors={[
            "rgba(255,255,255,1)",
            "rgba(43,224,228,0.689)",
            "rgba(38,190,221,1)",
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.circlemaincontainer}
        >
          <View style={styles.circleContainer}>
            <View style={styles.circle}>
              <Text style={styles.circleText}>CheckIn Time</Text>
              <Text style={styles.circleTime}>
                {checkInTime ? checkInTime : "--:--"}
              </Text>
            </View>
            <View style={styles.circle}>
              <Text style={styles.circleText}>CheckOut Time</Text>
              <Text style={styles.circleTime}>
                {checkOutTime ? checkOutTime : "--:--"}
              </Text>
            </View>
          </View>
        </LinearGradient>
        <LinearGradient
          colors={[
            "rgba(255,255,255,1)",
            "rgba(43,224,228,0.689)",
            "rgba(38,190,221,1)",
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.callendercontainer}
        >
          <Calendar style={styles.callender} markedDates={markedDates} />
        </LinearGradient>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  maincontainer: {
    padding: 20,
    borderRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 0,
    marginBottom: 5,
  },
  circlemaincontainer: {
    padding: 20,
    borderRadius: 40,
    backgroundColor: "#e8ecf4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 5,
  },
  callendercontainer: {
    padding: 20,
    borderRadius: 40,
    backgroundColor: "#e8ecf4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    paddingTop: 20,
    paddingLeft: 20,
    color: "#04214f",
    fontSize: 30,
    fontFamily: "Inter-Black",
  },
  container: {
    margin: 15,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  callender: {
    borderRadius: 40,
    overflow: "hidden",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  switchText: {
    fontSize: 16,
    marginRight: 10,
    fontWeight: "bold",
  },
  infoText: {
    color: "#757a82",
  },
  button: {
    backgroundColor: "#66aeed",
    borderRadius: 20, // Apply border radius here
    overflow: "hidden",
    marginTop: 10, // Added marginTop to separate buttons
  },
  image: {
    marginTop: 20,
    width: 60,
    height: 60,
  },
  circleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#66aeed",
    justifyContent: "center",
    alignItems: "center",
  },
  circleText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  circleTime: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: "center",
  },
});

export default App;
