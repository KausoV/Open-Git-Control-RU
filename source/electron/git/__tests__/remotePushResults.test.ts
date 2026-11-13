import { describe, expect, it } from 'vitest';
import type { GitPushTargetDto } from '../../../src/types/remoteTransfers';
import { pushResult } from '../remotePushResults';

const target: GitPushTargetDto = {
  id: 'origin-main',
  remoteName: 'origin',
  url: 'https://github.com/example/repository.git',
  destinationRef: 'refs/heads/main',
  sourceOid: 'a'.repeat(40),
};

describe('push result diagnostics', () => {
  it('preserves the server rejection reason and remediation alongside porcelain ref status', () => {
    const unblockUrl = 'https://github.com/example/repository/security/secret-scanning/unblock-secret/fixture';
    const result = pushResult(target, {
      exitCode: 1,
      stdout: `!\t${target.sourceOid}:refs/heads/main\t[remote rejected] (push declined due to repository rule violations)\n`,
      stderr: [
        'http.c: trace information',
        'remote: error: GH013: Repository rule violations found for refs/heads/main.',
        'remote: - GITHUB PUSH PROTECTION',
        'remote:   — Test fixture credential —',
        `remote:     commit: ${target.sourceOid}`,
        'remote:     path: tests/fixture.ts:12',
        `remote:     ${unblockUrl}`,
        'remote: diagnostic https://fixture-user:fixture-password@example.invalid/repo.git',
      ].join('\n'),
    });

    expect(result.status).toBe('rejected');
    expect(result.message).toContain('refs/heads/main: [remote rejected]');
    expect(result.message).toContain('GH013: Repository rule violations');
    expect(result.message).toContain('http.c: trace information');
    expect(result.message).toContain('https://[REDACTED]@example.invalid/repo.git');
    expect(result.message).not.toContain('fixture-user');
    expect(result.message).not.toContain('fixture-password');
    expect(result.message).toContain('GITHUB PUSH PROTECTION');
    expect(result.message).toContain('Test fixture credential');
    expect(result.message).toContain(`commit: ${target.sourceOid}`);
    expect(result.message).toContain('path: tests/fixture.ts:12');
    expect(result.message).toContain(unblockUrl);
    expect(result.refResults).toEqual([expect.objectContaining({ destinationRef: 'refs/heads/main', status: 'rejected' })]);
  });

  it('keeps actionable server diagnostics after a long HTTP trace within the display bound', () => {
    const unblockUrl = 'https://github.com/example/repository/security/secret-scanning/unblock-secret/fixture';
    const verboseTrace = '14:00:00.000 http.c: trace transfer progress to example.invalid\r\n'.repeat(500);
    expect(verboseTrace.length).toBeGreaterThan(20_000);
    const result = pushResult(target, {
      exitCode: 1,
      stdout: `!\t${target.sourceOid}:refs/heads/main\t[remote rejected] (repository rule violations)\n`,
      stderr:
        verboseTrace +
        [
          'remote: error: GH013: Repository rule violations found for refs/heads/main.',
          'remote: - GITHUB PUSH PROTECTION',
          'remote:   — Test fixture credential —',
          `remote:     commit: ${target.sourceOid}`,
          'remote:     path: tests/fixture.ts:12',
          `remote:     ${unblockUrl}`,
          'error: failed to push some refs',
          'fatal: publication was rejected',
        ].join('\r\n'),
    });

    expect(result.status).toBe('rejected');
    expect(result.message).toContain('refs/heads/main: [remote rejected]');
    expect(result.message).toContain('error: failed to push some refs');
    expect(result.message).toContain('fatal: publication was rejected');
    expect(result.message).toHaveLength(16_384);
    expect(result.message.indexOf(unblockUrl)).toBeLessThan(result.message.indexOf('http.c:'));
    expect(result.message).toContain('GH013: Repository rule violations');
    expect(result.message).toContain('GITHUB PUSH PROTECTION');
    expect(result.message).toContain('Test fixture credential');
    expect(result.message).toContain(`commit: ${target.sourceOid}`);
    expect(result.message).toContain('path: tests/fixture.ts:12');
    expect(result.message).toContain(unblockUrl);
  });

  it('keeps successful push messages free of streamed progress output', () => {
    const result = pushResult(target, {
      exitCode: 0,
      stdout: `*\t${target.sourceOid}:refs/heads/main\t[new branch]\n`,
      stderr: 'Writing objects: 100% (3/3), done.',
    });

    expect(result.status).toBe('success');
    expect(result.message).toBe('refs/heads/main: [new branch]');
  });

  it('retains diagnostics for a failed push without porcelain ref records and bounds output', () => {
    const result = pushResult(target, {
      exitCode: 1,
      stdout: '',
      stderr: `fatal: repository unavailable\n${'x'.repeat(20_000)}`,
    });

    expect(result.status).toBe('unknown');
    expect(result.message).toContain('fatal: repository unavailable');
    expect(result.message).toHaveLength(16_384);
  });
});
