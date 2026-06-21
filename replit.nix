# =============================================================================
# VANTA OS — Replit Nix Configuration
# System-level dependencies for the Replit environment.
# =============================================================================

{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.openssl
    pkgs.postgresql_16.lib
    pkgs.python3
    pkgs.gcc
    pkgs.gnumake
  ];
}
