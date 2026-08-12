#include <Arduino.h>
#line 1 "C:\\Users\\Admin\\Desktop\\stop 2chigi\\KARC\\KARC.ino"
// KARC sensor/alarm controller (Arduino Uno)
//
// A0 : infrared sensor (digital output, active LOW)
// A1, A2 : LEDs
// A3 : servo signal (reserved; no movement was requested)
// A4 : analog pulse sensor
// A5 : rotation sensor (digital output, active LOW)
// D4 : passive buzzer

const byte IR_SENSOR_PIN = A0;
const byte LED_1_PIN = A1;
const byte LED_2_PIN = A2;
const byte SERVO_PIN = A3;
const byte HEART_SENSOR_PIN = A4;
const byte ROTATION_SENSOR_PIN = A5;
const byte BUZZER_PIN = 4;

// Adjust these values to match the modules being used.
const int HEART_THRESHOLD = 550;
const unsigned long HEART_REFRACTORY_MS = 250;
const unsigned long HEART_MEASURE_GRACE_MS = 3000;
const unsigned long HEART_LOST_MS = 2000;
const unsigned long LED_BLINK_INTERVAL_MS = 50;
const unsigned long ROTATION_ALARM_HOLD_MS = 1500;
const unsigned long ALARM_STEP_MS = 120;

bool previousHeartHigh = false;
bool previousRotationDetected = false;
bool irWasDetected = false;
bool ledPhase = false;

unsigned long irDetectedAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastLedChangeAt = 0;
unsigned long rotationAlarmUntil = 0;
unsigned long lastAlarmStepAt = 0;
byte alarmStep = 0;

#line 39 "C:\\Users\\Admin\\Desktop\\stop 2chigi\\KARC\\KARC.ino"
void turnOffLeds();
#line 44 "C:\\Users\\Admin\\Desktop\\stop 2chigi\\KARC\\KARC.ino"
void updateHeartbeatAlarm(bool irDetected, unsigned long now);
#line 86 "C:\\Users\\Admin\\Desktop\\stop 2chigi\\KARC\\KARC.ino"
void updateRotationAlarm(unsigned long now);
#line 116 "C:\\Users\\Admin\\Desktop\\stop 2chigi\\KARC\\KARC.ino"
void setup();
#line 129 "C:\\Users\\Admin\\Desktop\\stop 2chigi\\KARC\\KARC.ino"
void loop();
#line 39 "C:\\Users\\Admin\\Desktop\\stop 2chigi\\KARC\\KARC.ino"
void turnOffLeds() {
  digitalWrite(LED_1_PIN, LOW);
  digitalWrite(LED_2_PIN, LOW);
}

void updateHeartbeatAlarm(bool irDetected, unsigned long now) {
  if (!irDetected) {
    irWasDetected = false;
    previousHeartHigh = false;
    turnOffLeds();
    return;
  }

  if (!irWasDetected) {
    irWasDetected = true;
    irDetectedAt = now;
    lastHeartbeatAt = now;
    lastLedChangeAt = now;
    ledPhase = false;
    turnOffLeds();
  }

  const int heartSignal = analogRead(HEART_SENSOR_PIN);
  const bool heartHigh = heartSignal >= HEART_THRESHOLD;

  // Count only the rising edge of a pulse, and reject unrealistically fast noise.
  if (heartHigh && !previousHeartHigh &&
      now - lastHeartbeatAt >= HEART_REFRACTORY_MS) {
    lastHeartbeatAt = now;
  }
  previousHeartHigh = heartHigh;

  const bool graceFinished = now - irDetectedAt >= HEART_MEASURE_GRACE_MS;
  const bool heartbeatMissing = now - lastHeartbeatAt >= HEART_LOST_MS;

  if (graceFinished && heartbeatMissing) {
    if (now - lastLedChangeAt >= LED_BLINK_INTERVAL_MS) {
      lastLedChangeAt = now;
      ledPhase = !ledPhase;
      digitalWrite(LED_1_PIN, ledPhase ? HIGH : LOW);
      digitalWrite(LED_2_PIN, ledPhase ? LOW : HIGH);
    }
  } else {
    turnOffLeds();
  }
}

void updateRotationAlarm(unsigned long now) {
  const bool rotationDetected = digitalRead(ROTATION_SENSOR_PIN) == LOW;

  // Each new sensor pulse extends the audible alarm period.
  if (rotationDetected && !previousRotationDetected) {
    rotationAlarmUntil = now + ROTATION_ALARM_HOLD_MS;
  }
  previousRotationDetected = rotationDetected;

  // Signed comparison remains safe even when millis() wraps around.
  const bool alarmActive = (long)(rotationAlarmUntil - now) > 0;
  if (!alarmActive) {
    noTone(BUZZER_PIN);
    alarmStep = 0;
    return;
  }

  if (now - lastAlarmStepAt >= ALARM_STEP_MS) {
    lastAlarmStepAt = now;
    alarmStep = (alarmStep + 1) % 4;

    // Alternating high tones with a short gap create an urgent siren pattern.
    if (alarmStep == 0 || alarmStep == 2) {
      noTone(BUZZER_PIN);
    } else {
      tone(BUZZER_PIN, alarmStep == 1 ? 1600 : 2400);
    }
  }
}

void setup() {
  pinMode(IR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(ROTATION_SENSOR_PIN, INPUT_PULLUP);
  pinMode(LED_1_PIN, OUTPUT);
  pinMode(LED_2_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // A3 is deliberately left unused until a servo movement is specified.
  (void)SERVO_PIN;
  turnOffLeds();
  noTone(BUZZER_PIN);
}

void loop() {
  const unsigned long now = millis();
  const bool irDetected = digitalRead(IR_SENSOR_PIN) == LOW;

  updateHeartbeatAlarm(irDetected, now);
  updateRotationAlarm(now);
}

