const { build, Platform, Arch } = require('electron-builder');

// A directory build is runnable without an installer or system-level changes.
build({
  targets: Platform.WINDOWS.createTarget(['dir'], Arch.x64),
  publish: 'never',
  config: {
    publish: null,
    // electron-builder merges these overrides with package.json itself.
    // Repeating upstream arrays would duplicate concurrent resource copies.
    directories: { output: '../app-build' },
    win: { signAndEditExecutable: false },
  },
}).catch(error => { console.error(error); process.exitCode = 1; });
