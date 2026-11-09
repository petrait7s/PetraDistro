{ appimageTools, lib }:
let
  pname = "petradms";
  version = "1.7.4";
  src = ./PetraDMS-${version}-x86_64.AppImage;
  contents = appimageTools.extract { inherit pname version src; };
in
appimageTools.wrapType2 {
  inherit pname version src;
  extraInstallCommands = ''
    install -Dm444 ${contents}/petradms.desktop $out/share/applications/petradms.desktop
    substituteInPlace $out/share/applications/petradms.desktop --replace-fail 'Exec=AppRun --no-sandbox' 'Exec=petradms --no-sandbox'
    install -Dm444 ${contents}/petradms.png $out/share/icons/hicolor/256x256/apps/petradms.png
  '';
  meta = {
    description = "PetraDMS distribution management";
    platforms = [ "x86_64-linux" ];
  };
}
