# Сборка Open Git Control RU

Инструкции относятся к метке `v3.2.3-ru.1` и Windows 10/11 x64. Для использования готового приложения сборка не нужна: скачайте переносимый ZIP из [релиза](https://github.com/KausoV/Open-Git-Control-RU/releases/tag/v3.2.3-ru.1).

## Зависимости

- Git for Windows.
- **Node.js 22.23.5 x64** с npm; скрипт допускает более новые исправления ветки Node.js 22. Это версия инструментов сборки, а не зависимость готового приложения.
- Windows PowerShell 5.1 или PowerShell 7.
- Доступ к сети для `npm ci`, загрузки Electron и, при сборке Recovery, пакетов Cargo.
- Для сборки Recovery из исходников: [Rust через rustup](https://rustup.rs/), toolchain **1.93.1**, цель `x86_64-pc-windows-msvc` и Visual Studio Build Tools с компонентами **Desktop development with C++**, MSVC и Windows SDK.

Сохранены `source/package-lock.json` и `source/recovery/Cargo.lock`. `npm ci` и `cargo --locked` используют закреплённые версии. Папка `source/.cargo` содержит параметры статической линковки Windows Recovery; она обязательна для сборки. Папка `translation` должна оставаться рядом с `source`.

## Сборка всего приложения из исходников

В PowerShell выполните:

```powershell
git clone https://github.com/KausoV/Open-Git-Control-RU.git
Set-Location Open-Git-Control-RU
git checkout v3.2.3-ru.1
rustup toolchain install 1.93.1 --profile minimal
rustup target add x86_64-pc-windows-msvc --toolchain 1.93.1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Build-Public.ps1
```

Скрипт устанавливает зависимости через `npm ci`, собирает каталоги перевода, создаёт лицензионные уведомления, собирает Recovery, TypeScript/React и переносимую папку Electron. Он явно выбирает Rust 1.93.1 для Recovery, не меняя глобальную настройку rustup. Автоматическая публикация отключена.

Результат: **`app-build/win-unpacked/Open-Git-Control.exe`**. Для переноса скопируйте всю папку `win-unpacked`. В ней нужны все файлы Electron, каталог `resources`, лицензии и Recovery. Исходники и установленные средства сборки на целевом компьютере не требуются; Git устанавливается отдельно.

`app-build` — каталог результатов сборки. Если приложение уже запускалось прямо из него и создало `user-data`, скрипт остановится: сначала перенесите всю готовую папку в постоянное место. Перед повторной сборкой закройте программу, запущенную из `app-build/win-unpacked`.

## Вариант с официальной Recovery без Rust

Если собирать Recovery не требуется, можно взять **полную папку** `resources/recovery` из официального установочного пакета Open Git Control **3.2.3**. Она должна содержать три файла: `Open-Git-Control-Recovery.exe`, `LICENSE` и `THIRD_PARTY_NOTICES.txt`. Папка с одним EXE недостаточна. Исходный установщик доступен в [официальном релизе](https://github.com/timbornemann/Open-Git-Control/releases/tag/v3.2.3); его можно распаковать средством для NSIS-архивов, включая 7-Zip, с последующим извлечением вложенного архива приложения.

```powershell
.\scripts\Build-Public.ps1 -RecoveryDirectory '.\official-3.2.3\resources\recovery'
```

Скрипт проверяет SHA-256 всех трёх файлов перед копированием. Поддерживается только неизменённая официальная Recovery версии 3.2.3:

| Файл | SHA-256 |
| --- | --- |
| `Open-Git-Control-Recovery.exe` | `1ecf6e0c91acd1b34a8bdbc473c8b5d897d6078c1606598965c1d1c68daac75b` |
| `LICENSE` | `3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986` |
| `THIRD_PARTY_NOTICES.txt` | `e7930410ca8ec972254488edfdd2684ba2a33b65091a9e8f4522ab34aec1b3db` |

SHA-256 официального установщика `Open-Git-Control-3.2.3-win-x64.exe`: `1f4cac57237bb984b0b8f8f544b0e6d62b5b7a8c15de0e6509213d758f98aa2a`. Исходный код Recovery включён в `source/recovery` независимо от выбранного способа сборки.

## Упаковка переносимого ZIP

После успешной сборки выполните из корня репозитория:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-public-release.ps1
```

Скрипт упаковки использует только `app-build/win-unpacked` и создаёт **`distribution/Open-Git-Control-3.2.3-ru.1-win-x64-portable.zip`**, `SHA256SUMS.txt` и отчёт проверки архива. В архиве находится папка `Open-Git-Control-3.2.3-ru.1-win-x64` с `app`, CMD-файлом запуска, пользовательской инструкцией, лицензией и манифестом выпуска. Профили пользователей не включаются. Файлы для загрузки публикуются отдельно от Git-исходников.

Существующий архив и промежуточная папка документации не перезаписываются. Перед повторной упаковкой проверьте и сохраните предыдущие результаты; для следующего выпуска можно передать, например, `-Version '3.2.3-ru.2'`.

## Проверки

Из папки `source` после установки зависимостей доступны:

```powershell
node scripts/assemble-russian-locale.cjs
npm run legal:check
npm run build
npm run test:unit
```

Полный набор исходных тестов может требовать дополнительные компоненты, включая Git LFS и Rust; см. [`source/CONTRIBUTING.md`](source/CONTRIBUTING.md). Сборка сама по себе не проверяет вход в GitHub или все сценарии графического интерфейса.

Эта инструкция воспроизводит приложение из опубликованных исходников и закреплённых зависимостей. Побайтовое совпадение EXE/архивов при разных версиях ОС и инструментов не гарантируется. Пакеты сообщества не имеют цифровой подписи Windows. `v3.2.3-ru.1` обозначает версию локализации; номер приложения и Recovery остаётся `3.2.3` для совместимости с исходной системой упаковки.
