import pyautogui
import serial
from serial.tools.list_ports import comports
import webbrowser
import tkinter

centerx = 0
centery = 0
update = False
pyautogui.FAILSAFE = False
comport = None
SCALE_FACTOR = 1 #0.9

# Open the sketchpad website
webbrowser.open('https://parkerc22.github.io/Sketchpadpp/')

root = tkinter.Tk()
width = root.winfo_screenwidth()
width_in = root.winfo_screenmmwidth()/25.4
MONITOR_DPI = (width/width_in)*SCALE_FACTOR

# Scan for the Arduino NANO 33 IoT
for port in comports():
    if ("Arduino NANO 33 IoT") in port.description:
        comport = port.device
# Read from serial and control mouse accordingly
while True:
    with serial.Serial(comport, 921600, timeout=1) as ser:
        try:
            line = ser.readline().decode("utf-8")   # read a '\n' terminated line
            values = line.split(':')
            if(len(values) == 2):
                if update:
                    pos = pyautogui.position()
                    centerx = pos[0]
                    centery = pos[1]
                    update = False
                pyautogui.moveTo(MONITOR_DPI*float(values[0])+centerx, MONITOR_DPI*float(values[1])+centery)
            elif len(values[0]):
                if(values[0][0] == 'F'):
                    pyautogui.click()
                elif(values[0][0] == 'L'):
                    update = True
        except Exception:
            continue

