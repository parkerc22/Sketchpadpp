/*
Code Referenced:
https://docs.arduino.cc/tutorials/nano-33-iot/imu-accelerometer/
https://docs.arduino.cc/tutorials/nano-33-iot/imu-gyroscope/
https://github.com/arduino-libraries/MadgwickAHRS
*/

#include <Arduino_LSM6DS3.h>
#include "MadgwickAHRS.h"
Madgwick filter;


bool reset = true;

const int buttonPin = 5;
const int rotaryAPin = 2;
const int rotaryBPin = 3;
const int rotaryPressPin = 4;

const float sensorRate = 104.00;

double base_pitch = 0;
double base_roll = 0;
double base_yaw = 0;

double distance = 15;

double prev_x = 0;
double prev_y = 0;

double flick_thresh = 250;

int prevA;
int prevB;

void setup()
{
        Serial.begin(921600);
        while (!Serial);

        if (!IMU.begin()) {
        while (1);
        }

        // initialize the pushbutton pin as an input:
        pinMode(buttonPin, INPUT);
        pinMode(rotaryAPin, INPUT);
        pinMode(rotaryBPin, INPUT);
        pinMode(rotaryPressPin, INPUT);

        prevA = digitalRead(rotaryAPin);
        prevB = digitalRead(rotaryBPin);

        reset = true;

        filter.begin(sensorRate);
}

void loop()
{
        int buttonState, A, B, headState;

        float x, y, ax, ay, az, gx, gy, gz;
        double yaw, pitch, roll;
        float roll1, pitch1, yaw1;
        if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()) {
                IMU.readAcceleration(ax, ay, az);
                IMU.readGyroscope(gx, gy, gz);
        }

        filter.updateIMU(gx, gy, gz, ax, ay, az);

        roll = filter.getRollRadians();
        pitch = filter.getPitchRadians();
        yaw = filter.getYawRadians();

        x = distance*tan(-(yaw-base_yaw));
        y = distance*tan(-(pitch-base_pitch));

        if (abs(gx) > flick_thresh*1.5 || abs(gy) > flick_thresh || abs(gz) > flick_thresh){
                Serial.println("F");
                reset = 1;
                delay(10);
        }
        headState = digitalRead(rotaryPressPin);
        if (headState != HIGH){
                Serial.println("F");
                delay(10);
        }
        buttonState = digitalRead(buttonPin);
        if (buttonState != HIGH) {
                if(reset){
                        base_pitch = pitch;
                        base_roll = roll;
                        base_yaw = yaw;
                        Serial.println("L");
                }else{
                        Serial.println("C");
                }
                reset = !reset;
                delay(500);
        }

        if(!reset){
                Serial.print(x);
                Serial.print(":");
                Serial.println(y); 
        }

        A = digitalRead(rotaryAPin);
        B = digitalRead(rotaryBPin);

        if (A == 0 && B == 0){
                if (prevA == 1){
                        distance += 0.1;
                        prevA = A;
                        prevB = B;
                }else if(prevB == 1){
                        distance -= 0.1;
                        prevA = A;
                        prevB = B;
                }
        } else if (A == 1 && B == 0){
                if (prevB == 1){
                        distance += 0.1;
                        prevA = A;
                        prevB = B;
                }else if(prevA == 0){
                        distance -= 0.1;
                        prevA = A;
                        prevB = B;
                }
        } else if (A == 1 && B == 1){
                if (prevA == 0){
                        distance += 0.1;
                        prevA = A;
                        prevB = B;
                }else if(prevB == 0){
                        distance -= 0.1;
                        prevA = A;
                        prevB = B;
                }
        } else if (A == 0 && B == 1){
                if (prevB == 0){
                        distance += 0.1;
                        prevA = A;
                        prevB = B;
                }else if(prevA == 1){
                        distance -= 0.1;
                        prevA = A;
                        prevB = B;

                }
        }
        if (distance < 0.5){
                distance = 0.5;
        }
        delay(8); // Was 10
}
