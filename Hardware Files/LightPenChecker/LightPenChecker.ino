void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600); // open the serial port at 9600 bps:
}

void loop() {
  // put your main code here, to run repeatedly:
  Serial.print("New cycle:");
  Serial.print("\n");
  Serial.println(digitalRead (2));
  Serial.print("\n");
  Serial.println(digitalRead (3));
  Serial.print("\n");
  Serial.println(digitalRead (4));
  Serial.print("\n");
  Serial.println(digitalRead (5));
  Serial.print("\n");
  
  delay(100);
}
