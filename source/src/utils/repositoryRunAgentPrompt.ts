import type { AppLanguage } from '@/i18nCore';
import { createEmptyRepositoryRunConfig } from '@/types/repositoryRun';

type RepositoryRunAgentPromptParams = {
  language: AppLanguage;
  repositoryPath: string;
};

const EMPTY_CONFIG_TEMPLATE = JSON.stringify(createEmptyRepositoryRunConfig(), null, 2);

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const getConfigPath = (repositoryPath: string): string => {
  const root = repositoryPath.replace(/[\\/]+$/, '');
  const separator = root.includes('\\') ? '\\' : '/';
  return `${root}${separator}.Open-Git-Control${separator}run.json`;
};

type PromptCopy = {
  task: string;
  procedure: string[];
  rules: string[];
  exampleTitle: string;
  templateTitle: string;
};

const getPromptCopy = (language: AppLanguage): PromptCopy => {
  if (language === 'ru') {
    const russian: PromptCopy = {
      task: 'Создай или обнови конфигурацию запуска Open Git Control для этого репозитория. Изменяй только файл конфигурации и необходимую для него структуру папки .Open-Git-Control.',
      procedure: [
        'Сначала изучи инструкции репозитория (например, AGENTS.md), существующую конфигурацию, реальные скрипты и инструменты проекта (например, package.json, lock-файлы, Cargo.toml, pyproject.toml, go.mod, .sln или файлы сборки). Не выдумывай команды, зависимости или скрипты.',
        'Создай папку .Open-Git-Control, если её нет, и запиши файл строго по указанному ниже целевому пути. Впоследствии команды будут выполняться из корневой папки репозитория.',
        'Сохрани подходящие существующие шаги и исправляй их, только если они не соответствуют изученному проекту. Добавляй только осмысленные и выполнимые для этого проекта действия; у неиспользуемых действий оставь пустой массив steps.',
        'Расположи шаги в нужном порядке выполнения. Ошибка шага останавливает действие, поэтому подготовительные шаги должны идти перед зависимыми.',
        'Перед завершением проверь, что run.json содержит корректный JSON и точно соответствует описанной ниже схеме. Затем кратко сообщи выбранные команды и целевой путь.',
      ],
      rules: [
        'version должен быть числом 1.',
        'actions должен содержать все пять действий: run, test, format, start и build. Каждое действие содержит массив steps.',
        'Каждому шагу нужны стабильный id, уникальный в рамках действия, непустой label и ровно один parser из списка: none, vitest-jest, eslint, typescript, prettier, diagnostic.',
        'Команды платформ необязательны, но каждому шагу действия нужна непустая command для каждой платформы, на которой действие должно быть доступно. Используй только эти оболочки: windows = powershell или cmd; macos = zsh; linux = bash.',
        'В шаге используй только поля платформ windows, macos и linux. Каждое указанное поле платформы содержит только shell и command. Длина id — не более 120 символов, label — не более 160, command — не более 16 000. В каждом действии должно быть не более 24 шагов.',
        'Выбери parser по формату вывода команды: vitest-jest для Vitest/Jest, eslint для ESLint, typescript для диагностики TypeScript, prettier для Prettier, diagnostic для распознаваемой диагностики с файлами и строками; иначе none.',
      ],
      exampleTitle: 'Структура одного шага (адаптируй команды и необязательные поля платформ к изученному проекту)',
      templateTitle: 'Пустой полный шаблон целевого файла',
    };
    const english = getPromptCopy('en');
    const pair = (original: string, translated: string) => `${original} (${translated})`;
    return {
      task: pair(english.task, russian.task),
      procedure: english.procedure.map((text, index) => pair(text, russian.procedure[index])),
      rules: english.rules.map((text, index) => pair(text, russian.rules[index])),
      exampleTitle: pair(english.exampleTitle, russian.exampleTitle),
      templateTitle: pair(english.templateTitle, russian.templateTitle),
    };
  }
  if (language === 'de') {
    return {
      task: 'Erstelle oder aktualisiere die Run-Konfiguration von Open Git Control fuer dieses Repository. Aendere dabei nur die Konfigurationsdatei und die fuer sie erforderliche .Open-Git-Control-Ordnerstruktur.',
      procedure: [
        'Pruefe zuerst Repository-Anweisungen (z. B. AGENTS.md), die vorhandene Konfiguration sowie die tatsaechlichen Skripte und Werkzeuge des Projekts (z. B. package.json, Lockfiles, Cargo.toml, pyproject.toml, go.mod, .sln oder Build-Dateien). Erfinde keine Befehle, Abhaengigkeiten oder Skripte.',
        'Lege .Open-Git-Control an, falls der Ordner fehlt, und schreibe die Datei exakt an den unten angegebenen Zielpfad. Die Befehle werden spaeter mit dem Repository-Stamm als Arbeitsverzeichnis ausgefuehrt.',
        'Behalte passende, bereits vorhandene Schritte bei und korrigiere sie nur, wenn sie nicht zum untersuchten Projekt passen. Lege nur Aktionen an, die im Projekt sinnvoll und ausfuehrbar sind; nicht verwendete Aktionen bleiben mit einem leeren steps-Array erhalten.',
        'Ordne Schritte in ihrer gewuenschten Ausfuehrungsreihenfolge an. Ein fehlgeschlagener Schritt beendet die jeweilige Aktion, daher muessen vorbereitende Schritte vor abhaengigen Schritten stehen.',
        'Pruefe vor Abschluss, dass run.json valides JSON ist und exakt dem beschriebenen Schema entspricht. Antworte danach kurz mit den gewaehlten Befehlen und dem Zielpfad.',
      ],
      rules: [
        'version muss die Zahl 1 sein.',
        'actions muss alle fuenf Aktionen run, test, format, start und build enthalten. Jede Aktion enthaelt ein steps-Array.',
        'Jeder Schritt benoetigt eine innerhalb seiner Aktion eindeutige, stabile id, ein nicht leeres label und genau einen parser aus: none, vitest-jest, eslint, typescript, prettier, diagnostic.',
        'Plattformbefehle sind optional, aber jeder Schritt einer Aktion braucht fuer jede Plattform, auf der diese Aktion nutzbar sein soll, einen nicht leeren Befehl. Verwende nur die erlaubten Shells: windows = powershell oder cmd; macos = zsh; linux = bash.',
        'Verwende pro Schritt nur die Plattformfelder windows, macos und linux. Jedes vorhandene Plattformfeld hat genau shell und command. Halte ids bei maximal 120 Zeichen, labels bei maximal 160 Zeichen, commands bei maximal 16.000 Zeichen und verwende hoechstens 24 Schritte pro Aktion.',
        'Waehle den Parser passend zur Ausgabe: vitest-jest fuer Vitest/Jest, eslint fuer ESLint, typescript fuer TypeScript-Diagnosen, prettier fuer Prettier und diagnostic fuer allgemein erkennbare Datei-/Zeilen-Diagnosen; sonst none.',
      ],
      exampleTitle: 'Form eines einzelnen Schritts (Befehle und optionale Plattformfelder an das untersuchte Projekt anpassen)',
      templateTitle: 'Leere, vollstaendige Vorlage fuer die Ziel-Datei',
    };
  }

  return {
    task: 'Create or update the Open Git Control run configuration for this repository. Change only the configuration file and the .Open-Git-Control directory structure required for it.',
    procedure: [
      "First inspect repository instructions (for example AGENTS.md), the existing configuration, and the project's actual scripts and tooling (for example package.json, lockfiles, Cargo.toml, pyproject.toml, go.mod, .sln, or build files). Do not invent commands, dependencies, or scripts.",
      'Create .Open-Git-Control if it does not exist, then write the file exactly to the target path below. Commands will later run with the repository root as their working directory.',
      'Keep suitable existing steps and correct them only when they do not fit the inspected project. Add only actions that are meaningful and executable for this project; leave unused actions with an empty steps array.',
      'Put steps in their intended execution order. A failed step stops its action, so prerequisite steps must come before dependent steps.',
      'Before finishing, verify that run.json is valid JSON and exactly follows the schema below. Then briefly report the selected commands and target path.',
    ],
    rules: [
      'version must be the number 1.',
      'actions must contain all five actions: run, test, format, start, and build. Each action contains a steps array.',
      'Every step needs a stable id that is unique within its action, a non-empty label, and exactly one parser from: none, vitest-jest, eslint, typescript, prettier, diagnostic.',
      'Platform commands are optional, but every step in an action needs a non-empty command for every platform where that action should be available. Use only these shells: windows = powershell or cmd; macos = zsh; linux = bash.',
      'Use only the platform fields windows, macos, and linux on a step. Each present platform field has exactly shell and command. Keep ids at most 120 characters, labels at most 160 characters, commands at most 16,000 characters, and use at most 24 steps per action.',
      'Choose the output parser to match the command: vitest-jest for Vitest/Jest, eslint for ESLint, typescript for TypeScript diagnostics, prettier for Prettier, and diagnostic for generally recognizable file/line diagnostics; otherwise use none.',
    ],
    exampleTitle: 'Shape of one step (adapt commands and optional platform fields to the inspected project)',
    templateTitle: 'Empty, complete template for the target file',
  };
};

export const buildRepositoryRunAgentPrompt = ({ language, repositoryPath }: RepositoryRunAgentPromptParams): string => {
  const copy = getPromptCopy(language);
  const configPath = getConfigPath(repositoryPath);
  const stepExample = {
    id: 'unique-step-id',
    label: 'Readable step label',
    parser: 'none',
    windows: { shell: 'powershell', command: 'project command for Windows' },
    macos: { shell: 'zsh', command: 'project command for macOS' },
    linux: { shell: 'bash', command: 'project command for Linux' },
  };
  const exampleTag = language === 'de' ? 'schritt_beispiel' : 'step_example';
  const templateTag = language === 'de' ? 'leere_vorlage' : 'empty_template';

  return [
    '<task>',
    copy.task,
    '</task>',
    '',
    '<repository_context>',
    `  <repository_root>${escapeXml(repositoryPath)}</repository_root>`,
    `  <target_file>${escapeXml(configPath)}</target_file>`,
    '</repository_context>',
    '',
    '<procedure>',
    ...copy.procedure.map((instruction, index) => `${index + 1}. ${instruction}`),
    '</procedure>',
    '',
    '<format_rules>',
    ...copy.rules.map((rule, index) => `${index + 1}. ${rule}`),
    '</format_rules>',
    '',
    `<${exampleTag}>`,
    copy.exampleTitle,
    '```json',
    JSON.stringify(stepExample, null, 2),
    '```',
    `</${exampleTag}>`,
    '',
    `<${templateTag}>`,
    copy.templateTitle,
    '```json',
    EMPTY_CONFIG_TEMPLATE,
    '```',
    `</${templateTag}>`,
  ].join('\n');
};
