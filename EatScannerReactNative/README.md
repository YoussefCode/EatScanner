# EatScanner React Native (v0.1)

React Native (Expo + TypeScript) versie van EatScanner zodat je later eenvoudig naar iOS kunt deployen.

## Wat deze app doet

0. Onboarding bij eerste start (eenmalig).
1. Barcode scannen met live camera preview.
2. Productinformatie ophalen via OpenFoodFacts.
3. Ingredientenfoto maken of uploaden.
4. OCR (cloud opt-in) of handmatige OCR tekst fallback.
5. Ingredienten parseren en normaliseren.
6. AI-first matching tegen verboden lijst (dynamisch, zonder statische synoniemenmap).
7. Resultaat tonen als Veilig/Niet veilig met highlights, confidence en bron.

## Schermstructuur

- Onboarding (eerste keer)
- Scan pagina: barcode + product lookup
- Controle pagina: OCR/ingredienten + veiligheidscontrole
- Profiel pagina: verboden ingredienten beheren

## Stack

- Expo
- React Native + TypeScript
- expo-camera
- expo-image-picker
- AsyncStorage

## Installatie

```bash
cd EatScannerReactNative
npm install
npm run start
```

## iOS run

```bash
npm run ios
```

Op macOS met Xcode geinstalleerd opent dit een iOS build via Expo prebuild/run.

## Productie deployment later

Voor App Store-ready builds kun je EAS gebruiken:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
```

## Configuratie

Configureer keys en endpoints in [src/config/appConfig.ts](src/config/appConfig.ts):

- `cloudOCR.endpoint`
- `cloudOCR.apiKey`
- `llm.endpoint`
- `llm.apiKey`

Standaard staat cloud OCR uit (`enabledByUserOptIn = false`) voor privacy.

## OCR gedrag

- Als cloud OCR uitstaat of leeg terugkomt, gebruik je het handmatige OCR tekstveld in de UI.
- Je kunt later native on-device OCR toevoegen met een custom native module of een Expo-compatible plugin.

## Tests

```bash
npm test
```

- Parser tests: [__tests__/parser.test.ts](__tests__/parser.test.ts)
- Matcher tests: [__tests__/matcher.test.ts](__tests__/matcher.test.ts)

## Belangrijke noot

Dit is de actieve en enige app in deze workspace.
