# PetraDMS on NixOS (AppImage)

Download the `PetraDMS-Linux-AppImage` artifact from GitHub Actions, unzip it, then:

    chmod +x PetraDMS-1.6.1-x86_64.AppImage

## Quick run (no config change)

    nix-shell -p appimage-run --run "appimage-run ./PetraDMS-1.6.1-x86_64.AppImage"

## Permanent (configuration.nix)

    programs.appimage = { enable = true; binfmt = true; };

Then `sudo nixos-rebuild switch` and run `./PetraDMS-1.6.1-x86_64.AppImage` directly.

## Installed as a Nix package (menu entry + `petradms` command)

Put the AppImage next to `petradms.nix` and add `pkgs.callPackage ./petradms.nix {}` to
`environment.systemPackages` or `home.packages`. See `petradms.nix`.
