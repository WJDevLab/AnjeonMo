# AnjeonMo (안전母)

> **A shared electric scooter safety management web app developed with my teammates at the Kakao AI Rookie Camp.**

In this project, I was responsible for **web app development and service planning**.

---

## Project Overview

AnjeonMo is a project designed to promote safer use of shared electric scooters by detecting unsafe behaviors such as **riding with two or more people** and **riding without a helmet**. It also allows parents or guardians to check their children's riding status and safety records.

The name **“AnjeonMo (안전母)”** has two meanings. In Korean, **“안전모 (anjeonmo)” means “safety helmet,”** representing the project's goal of physically protecting users from accidents. At the same time, the character **“母 (mo)” means “mother,”** representing the idea of protecting users with the same care and concern that a mother has for her child.

In other words, the name combines the idea of a **safety helmet that protects the rider** with the **protective care of a mother watching over her child**.

When planning this project, we focused on **solving a real-world problem** rather than simply creating new features.

We selected shared electric scooter accidents as the main problem and created fictional personas to define the problem and target users more clearly.

---

## 👥 Persona

### Kim Rae-in — Parent

- Lives in an area where shared electric scooters are commonly used
- Has seen her son, Kim Min-jun, riding an electric scooter with a friend without wearing a helmet
- Drives frequently and finds it difficult to predict and react to the movements of electric scooter riders
- Worries that her son may get into an accident while riding an electric scooter

### Kim Min-jun — Child

- Frequently uses shared electric scooters
- Usually does not wear a helmet while riding
- Often rides on a single electric scooter together with a friend

---

## 😟 Persona's Main Concerns

Kim Rae-in feels anxious when driving because the movements of shared electric scooter riders can be difficult to predict.

Because electric scooters are smaller and can move unpredictably compared to cars, a collision could seriously injure the scooter rider while also placing significant responsibility on the driver.

She also worries that other drivers may have the same difficulty responding to electric scooters, which makes her concerned about her son's safety whenever he rides one.

Based on these concerns, we designed the project around the following ideas:

- **Detect how many people are riding** the electric scooter
- **Detect whether the rider is wearing a helmet**
- Allow the scooter to operate only when safety conditions are satisfied
- Restrict riding when safety conditions are violated during a ride
- Allow parents or guardians to check their child's riding status and safety records through the web app

---

# 🛴 Hardware / Arduino

We used pressure sensors on the electric scooter and helmet to detect the number of riders and whether the rider is wearing a helmet.

### Rider Detection

Pressure sensors installed on the scooter's footboard detect the number of feet placed on it.

- **2 feet detected → Considered a normal single-rider condition**
- **3 or more feet detected → Possible multiple riders detected, operation restricted**

### Helmet Detection

A pressure sensor is also installed inside the helmet to detect whether the rider is wearing it.

- Helmet detected → Riding allowed
- Helmet not detected → Riding restricted

### Safety Monitoring During a Ride

The system is designed to continuously monitor the sensor status even after the ride has started.

If an additional person gets on the scooter or the rider removes their helmet during the ride, the scooter is designed to **gradually slow down and stop instead of stopping immediately**.

---

# 📱 Web App

## 🗺️ Map

Users can view nearby shared electric scooters on a map.

When a scooter icon on the map is selected, information about that scooter is displayed.

Displayed information includes:

- Remaining battery
- Estimated available riding distance

When the user presses the `Start Ride` button, they are taken to a **Safety Check page** before the ride begins.

---

## ✅ Safety Check

Before starting a ride, the web app communicates with the Arduino system to check whether the rider satisfies the required safety conditions.

### 1. Rider Detection

Pressure sensors detect the number and positions of feet placed on the scooter's footboard.

When two feet are detected normally, **foot icons appear on the scooter illustration in the web app at positions corresponding to the actual detected locations on the physical scooter**.

If the system determines that only one person is riding, it automatically proceeds to the next step.

If three or more feet are detected, the detected positions are displayed in the same way, and the user is instructed to check their riding position again.

### 2. Helmet Check

After passing the rider detection step, the system checks whether the rider is wearing a helmet.

- Helmet detected → Proceed to the next step
- Helmet not detected → Display a message asking the rider to wear a helmet

Once all safety conditions are satisfied, the user is taken to the **Riding page**.

---

## 🛣️ During the Ride

The Riding page is designed to display important information about the current ride in real time.

Displayed information includes:

- Riding time
- Current fare
- Estimated remaining riding distance
- Remaining battery

---

## 👨‍👩‍👦 Friends

Users can add friends and check their shared electric scooter usage information.

This feature was designed especially for **parents or guardians who are concerned about their children's electric scooter usage**, allowing them to check their child's current riding status.

Available information includes:

- Whether the user is currently riding a scooter
- When they last used a scooter
- Riding history
- Safety-related records

This allows parents or guardians to check their child's riding status through the web app without having to contact them repeatedly, helping provide greater peace of mind.

---

## 📊 Ride History

Users can view the dates on which they used an electric scooter through a calendar.

Selecting a date displays detailed records for that day.

### Daily Records

- Riding distance
- Fare
- Safety restriction records
  - Number of times riding was restricted due to multiple riders
  - Number of times riding was restricted because the helmet was not worn or was removed during the ride

### Monthly Statistics

Below the calendar, users can view statistics summarizing their riding activity for the selected month.

This feature allows users to review not only their riding history but also their **safe riding habits**.

---

# 👨‍💻 My Role

In this project, I was responsible for:

- **Service planning**
- **Web app UI/UX planning**
- **Web app implementation**
- **Designing the safety check interface and user flow using sensor data**

The Arduino system, sensor hardware implementation, and hardware integration were developed in collaboration with my teammates.

---

# ⚠️ Repository Notice

After the Kakao AI Rookie Camp ended, I accidentally backed up **an earlier version of the web app instead of the final completed version**.

Therefore, many of the features described in this README may not be fully implemented or functional in the code currently uploaded to this GitHub repository.

This README describes the **features and structure of the final project that we actually planned and implemented during the camp**.

---

## 🏕️ Project

**Kakao AI Rookie Camp**

A team project created to improve the safety of shared electric scooter users and reduce the concerns of parents and guardians.



---

# 안전母(모)

> **카카오 AI 루키 캠프에서 팀원들과 함께 제작한 공유 전동 킥보드 안전 관리 웹앱 프로젝트입니다.**

본 프로젝트에서 저는 **웹앱 개발과 서비스 기획**을 담당했습니다.

---

## 프로젝트 소개

안전母(모)는 공유 전동 킥보드 이용 중 발생할 수 있는 **2인 이상 탑승**과 **헬멧 미착용** 문제를 감지하여 보다 안전한 이용을 돕고, 보호자가 자녀의 이용 상태와 안전 기록을 확인할 수 있도록 기획한 프로젝트입니다.

프로젝트명 **‘안전母(모)’**에는 두 가지 의미가 담겨 있습니다.첫 번째는 머리를 보호하는 **‘안전모’**처럼 사용자를 사고로부터 보호한다는 의미이고, 두 번째는 어머니를 뜻하는 한자 **‘母(모)’**를 사용하여 어머니가 자녀를 걱정하고 지켜주는 마음처럼 사용자의 안전을 보호한다는 의미입니다.

즉, **사용자를 직접적으로 보호하는 ‘안전모’와 자녀의 안전을 걱정하는 ‘어머니의 마음’**이라는 두 가지 의미를 하나의 이름에 담았습니다.

프로젝트를 기획할 때 단순히 새로운 기능을 만드는 것보다 **실생활에서 실제로 발생하고 있는 문제를 해결하는 것**에 초점을 맞췄습니다.

이에 따라 공유 전동 킥보드 사고 문제를 주제로 선정하고, 문제와 사용자를 보다 구체적으로 정의하기 위해 가상의 페르소나를 설정했습니다.

---

## 👥 Persona

### 김래인 — 학부모

- 공유 전동 킥보드 이용자가 많은 지역에 거주
- 아들 김민준이 친구와 함께 헬멧을 쓰지 않고 전동 킥보드를 타는 모습을 본 경험이 있음
- 운전을 자주 하며, 전동 킥보드 이용자의 움직임을 예측하고 대응하는 데 어려움을 느낌
- 자녀가 전동 킥보드를 이용하다 사고를 당할 가능성을 걱정함

### 김민준 — 자녀

- 공유 전동 킥보드를 자주 이용
- 헬멧을 잘 착용하지 않음
- 친구와 함께 한 대의 전동 킥보드를 타는 경우가 많음

---

## 😟 Persona의 주요 불안 요소

김래인은 자동차를 운전할 때 공유 전동 킥보드 이용자의 움직임을 예측하기 어렵다는 불안감을 가지고 있습니다.

자동차보다 작고 움직임이 빠른 전동 킥보드와 사고가 발생할 경우 킥보드 이용자가 크게 다칠 수 있으며, 운전자 역시 큰 책임을 질 수 있습니다.

또한 다른 운전자들도 자신과 마찬가지로 전동 킥보드에 대응하기 어려울 것이라고 생각하여, 아들이 킥보드를 이용할 때마다 사고가 발생하지 않을지 걱정합니다.

우리는 이러한 불안 요소를 바탕으로 다음과 같은 방향으로 프로젝트를 기획했습니다.

- 전동 킥보드에 **몇 명이 탑승했는지 감지**
- 사용자가 **헬멧을 착용했는지 감지**
- 안전 조건이 충족되어야 주행 가능
- 주행 중 안전 조건이 깨질 경우 주행 제한
- 보호자가 웹앱을 통해 자녀의 이용 상태와 안전 기록을 확인

---

# 🛴 Hardware / Arduino

전동 킥보드와 헬멧에 압력 센서를 적용하여 탑승 인원과 헬멧 착용 여부를 확인하도록 구성했습니다.

### 탑승 인원 감지

킥보드 발판에 설치된 압력 센서를 통해 발의 개수를 감지합니다.

- **발 2개 감지 → 정상적인 1인 탑승으로 판단**
- **발 3개 이상 감지 → 2인 이상 탑승 가능성으로 판단하여 작동 제한**

### 헬멧 착용 감지

헬멧 내부에도 압력 센서를 부착하여 사용자의 헬멧 착용 여부를 감지합니다.

- 헬멧 착용 확인 → 주행 가능
- 헬멧 미착용 → 주행 제한

### 주행 중 안전 감지

주행을 시작한 이후에도 센서 상태를 지속적으로 확인하도록 기획했습니다.

주행 중 추가 인원이 탑승하거나 사용자가 헬멧을 벗는 등 안전 조건이 충족되지 않을 경우, 킥보드가 **즉시 정지하는 대신 서서히 감속한 뒤 주행을 멈추도록** 설계했습니다.

---

# 📱 Web App

## 🗺️ 지도

지도에서 주변 공유 전동 킥보드를 확인할 수 있습니다.

지도에 표시된 킥보드 아이콘을 선택하면 해당 킥보드의 정보를 확인할 수 있도록 기획했습니다.

표시 정보:

- 배터리 잔량
- 이용 가능 주행 거리

`주행 시작` 버튼을 누르면 실제 주행을 시작하기 전에 **안전 검사 페이지**로 이동합니다.

---

## ✅ 안전 검사

주행 전에 아두이노와 통신하여 사용자가 안전 조건을 만족했는지 확인합니다.

### 1. 탑승 인원 검사

압력 센서를 이용하여 킥보드 발판에 올라온 발의 위치와 개수를 확인합니다.

발이 2개로 정상 인식되면 웹앱의 킥보드 그림 위에 **실제 발판에서 감지된 위치와 동일한 위치에 발 모양이 표시**됩니다.

정상적인 1인 탑승으로 판단되면 다음 단계로 자동 진행됩니다.

반대로 발이 3개 이상 감지될 경우 동일하게 감지된 위치를 화면에 표시하고, 사용자에게 탑승 상태를 다시 확인하라는 안내를 표시합니다.

### 2. 헬멧 검사

탑승 인원 검사를 통과하면 헬멧 착용 여부를 확인합니다.

- 헬멧 착용 확인 → 다음 단계로 이동
- 헬멧 미착용 → 헬멧을 착용하라는 안내 표시

모든 안전 조건을 만족하면 **주행 중 페이지**로 이동합니다.

---

## 🛣️ 주행 중

현재 주행에 필요한 정보를 실시간으로 확인할 수 있도록 기획했습니다.

표시 정보:

- 이용 시간
- 현재 요금
- 이용 가능 거리
- 잔여 배터리

---

## 👨‍👩‍👦 친구

친구를 추가하고 친구의 전동 킥보드 이용 정보를 확인할 수 있는 기능입니다.

이 기능은 특히 **자녀의 전동 킥보드 이용을 걱정하는 보호자**가 자녀의 현재 이용 상태를 확인할 수 있도록 만들었습니다.

확인 가능한 정보:

- 현재 킥보드 이용 여부
- 마지막 이용 시점
- 이용 기록
- 안전 관련 기록

이를 통해 보호자가 자녀에게 계속 연락하지 않아도 웹앱을 통해 이용 상태를 확인하고 안심할 수 있도록 기획했습니다.

---

## 📊 이용 내역

달력을 통해 전동 킥보드를 이용한 날짜를 확인할 수 있습니다.

이용한 날짜를 선택하면 해당 날짜의 상세 기록을 확인할 수 있도록 기획했습니다.

### 일별 기록

- 주행 거리
- 이용 요금
- 안전 제한 내역
  - 2인 이상 탑승으로 제한된 횟수
  - 헬멧 미착용 또는 주행 중 헬멧을 벗어 제한된 횟수

### 월별 통계

달력 아래에는 해당 달의 이용 기록을 종합하여 확인할 수 있는 통계 화면을 구성했습니다.

이를 통해 단순한 이동 기록뿐 아니라 사용자의 **안전한 킥보드 이용 습관**까지 확인할 수 있도록 했습니다.

---

# 👨‍💻 My Role

본 프로젝트에서 저는 다음 역할을 담당했습니다.

- **서비스 기획**
- **웹앱 UI/UX 기획**
- **웹앱 구현**
- **센서 데이터를 활용한 안전 검사 화면 및 사용자 흐름 설계**

아두이노와 센서 하드웨어 구현 및 연결은 팀원과 협업하여 진행했습니다.

---

# ⚠️ Repository Notice

카카오 AI 루키 캠프가 끝난 후 프로젝트를 백업하는 과정에서 실수로 &#x2A;*최종 완성본이 아닌 이전 버전의 웹앱 코드를 백업했습니다.**

따라서 현재 이 GitHub Repository에 업로드된 코드에서는 README에 설명된 기능 중 상당수가 정상적으로 구현되어 있지 않거나 동작하지 않을 수 있습니다.

이 README는 &#x2A;*캠프 당시 실제로 기획하고 구현했던 최종 프로젝트의 기능과 구조를 기준으로 작성했습니다.**

---

## 🏕️ Project

**Kakao AI Rookie Camp**

공유 전동 킥보드 이용자의 안전을 높이고 보호자의 불안감을 줄이는 것을 목표로 제작한 팀 프로젝트입니다.
