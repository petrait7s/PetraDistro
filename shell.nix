# NixOS dev shell: `nix-shell` then `cd app && npm install && electron .`
{ pkgs ? import <nixpkgs> { } }:
pkgs.mkShell {
  packages = [ pkgs.nodejs_22 pkgs.electron pkgs.git ];
  ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
  shellHook = ''
    export PETRA_LICENSE_SECRET="''${PETRA_LICENSE_SECRET:-dev-secret-change-me-0123456789abcdef}"
    echo "PetraDMS dev shell. Run: cd app && npm install && electron ."
  '';
}
