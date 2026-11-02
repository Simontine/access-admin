// ESP32 dev board: polls Firebase Realtime Database /lock to operate a lock, relay, and buzzer.
// Drive the lock and relay inputs from GPIO 2 and GPIO 5 respectively. Power the lock from
// its own supply (never directly from an ESP32 pin); add a flyback diode if required.
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "Mahle";
const char* WIFI_PASS = "23atiLeM";
// e.g. https://your-project-default-rtdb.firebaseio.com  (no trailing slash)
const char* FIREBASE_URL = "https://face-recognition-68205-default-rtdb.firebaseio.com";
const char* FIREBASE_AUTH = "";  // database secret/token, or empty if rules are open

const int LOCK_PIN = 2;
const int RELAY_PIN = 5;
const int RED_Light = 26;
const int BUZZER_PIN = 4;
const bool ACTIVE_HIGH = true;        // set false for active-low relay modules
const unsigned long OPEN_MS = 3000;   // how long the lock stays released
const unsigned long BUZZ_MS = 2000;   // how long the buzzer sounds for denied access
const unsigned long POLL_MS = 1000;
String lastBuzzedAt;

String lockUrl() {
  String u = String(FIREBASE_URL) + "/lock.json";
  if (strlen(FIREBASE_AUTH)) u += String("?auth=") + FIREBASE_AUTH;
  return u;
}

void setLock(bool open) {
  digitalWrite(LOCK_PIN, (open == ACTIVE_HIGH) ? HIGH : LOW);
  digitalWrite(RELAY_PIN, (open == ACTIVE_HIGH) ? LOW : HIGH);
  digitalWrite(RED_Light, (open == ACTIVE_HIGH) ? LOW : HIGH);
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " failed");
}

String jsonNumber(const String& body, const char* key) {
  String field = String("\"") + key + "\":";
  int start = body.indexOf(field);
  if (start < 0) return "";
  start += field.length();
  while (start < body.length() && body[start] == ' ') start++;
  int end = start;
  while (end < body.length() && body[end] >= '0' && body[end] <= '9') end++;
  return body.substring(start, end);
}

void acknowledgeBuzzer(const String& at) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, lockUrl());
  http.addHeader("Content-Type", "application/json");
  int code = http.PATCH(String("{\"buzzedAt\":") + at + "}");
  if (code < 200 || code >= 300) {
    Serial.printf("Firebase buzzer acknowledgement failed: %d\n", code);
  }
  http.end();
}

void processCommands() {
  WiFiClientSecure client;
  client.setInsecure();  // for production, pin the Google root CA instead
  HTTPClient http;
  http.begin(client, lockUrl());
  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    bool unlock = body.indexOf("\"unlock\":true") >= 0;
    bool denied = body.indexOf("\"status\":\"Denied\"") >= 0;
    String at = jsonNumber(body, "at");
    String buzzedAt = jsonNumber(body, "buzzedAt");
    http.end();

    if (denied && at.length() && at != buzzedAt && at != lastBuzzedAt) {
      Serial.println("Access denied: buzzer");
      digitalWrite(BUZZER_PIN, HIGH);
      delay(BUZZ_MS);
      digitalWrite(BUZZER_PIN, LOW);
      lastBuzzedAt = at;
      acknowledgeBuzzer(at);
    }

    if (unlock && !denied) {
      Serial.println("Unlock");
      setLock(true);
      delay(OPEN_MS);
      setLock(false);
      clearUnlock();
    }
    return;
  }
  http.end();
}

// Fallback in case the app didn't reset the flag.
void clearUnlock() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, lockUrl());
  http.addHeader("Content-Type", "application/json");
  http.PATCH("{\"unlock\":false}");
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(LOCK_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(RED_Light, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  setLock(false);
  connectWifi();
}

void loop() {
  connectWifi();
  if (WiFi.status() == WL_CONNECTED) processCommands();
  delay(POLL_MS);
}
