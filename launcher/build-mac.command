#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")/.."
npm run build
APP_PATH="$PWD/build/학교 탐색.app"
mkdir -p "$APP_PATH/Contents/MacOS" "$APP_PATH/Contents/Resources/Web"
xcrun clang -fobjc-arc -mmacosx-version-min=13.0 -arch arm64 -framework Cocoa launcher/SchoolWalk.m -o /private/tmp/SchoolWalk-arm64
xcrun clang -fobjc-arc -mmacosx-version-min=13.0 -arch x86_64 -framework Cocoa launcher/SchoolWalk.m -o /private/tmp/SchoolWalk-x86_64
xcrun lipo -create /private/tmp/SchoolWalk-arm64 /private/tmp/SchoolWalk-x86_64 -output "$APP_PATH/Contents/MacOS/SchoolWalk"
cp launcher/Info.plist "$APP_PATH/Contents/Info.plist"
cp launcher/SchoolWalk.icns "$APP_PATH/Contents/Resources/SchoolWalk.icns"
cp -R dist/. "$APP_PATH/Contents/Resources/Web/"
codesign --force --deep --sign - "$APP_PATH"
echo "완료: $APP_PATH"
