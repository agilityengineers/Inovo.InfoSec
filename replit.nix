# Used by Replit environments that are not on the newer `modules` system.
# `modules = ["nodejs-20", "postgresql-16"]` in .replit covers the rest.
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.postgresql_16
  ];
}
