{
  description = "softres.io";

  inputs = {
    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixos-unstable";
    };
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    eachSystem = f: nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (system: f nixpkgs.legacyPackages.${system});
  in {
    devShells = eachSystem (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          deno
          pre-commit
          jq
          python3Packages.requests
          python3Packages.demjson3
          python3Packages.tqdm
          moreutils
        ];
        shellHook = ''
          pre-commit install
          (cd frontend && deno install)
          (cd backend && deno install)
        '';
      };
    });
  };
}
