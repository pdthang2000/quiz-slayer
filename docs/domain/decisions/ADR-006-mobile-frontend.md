# ADR-006: Mobile frontend — React Native with Expo, iPhone first

- Date: 2026-10-22
- Status: accepted

## Context
Flashcards and "10 Quizzes per day" are phone habits (short sessions, audio, reminders). v1 is for Jackkie's own use, installed outside the app stores. Web comes later (B-08).

## Decision
- React Native with **Expo**. The app is UI only: it calls the NestJS API. No business rules in the app.
- Online-only in v1 (no offline study or sync).
- Test on Jackkie's **iPhone** first: build on his Mac, install by cable with a free Apple ID (the install expires after 7 days; rebuild to renew).
- Friends test with an **Android APK** (free, no expiry).
- Daily development uses Expo Go. Builds run locally on the Mac (free); EAS cloud builds only occasionally.

## Options considered
- Next.js — strong for SEO/public pages, but a second backend tempts business logic into server actions; not needed for a logged-in study app.
- React + Vite web SPA — simplest web option; web is later.
- Bare React Native — no need for custom native code.

## Consequences
- Cost: $0 for v1. Apple Developer Program ($99/year) only if long-term iPhone installs or the App Store are needed. Google Play $25 one-time only for the Play Store.
- Remote push notifications need a paid Apple account on iOS.
- UI rules written for web get a mobile form (e.g. UI-06 → long-press + bottom sheet).
- The phone must reach the API: home Wi-Fi uses the Mac's LAN IP; outside needs hosting (open question H-01).
