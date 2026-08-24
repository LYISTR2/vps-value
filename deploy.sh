#!/usr/bin/env bash
set -Eeuo pipefail

REPO="LYISTR2/vps-value"
INSTALL_DIR="${VPS_VALUE_DIR:-/opt/vps-value}"
if [[ -n "${PORT+x}" ]]; then PORT_OVERRIDE=1; else PORT_OVERRIDE=""; fi
PORT="${PORT:-8088}"
ACTION="${1:-install}"

info(){ printf '\033[1;37m[INFO]\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
fail(){ printf '\033[1;31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "请使用 root 运行。"

compose(){
  if docker compose version >/dev/null 2>&1; then docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then docker-compose "$@"
  else fail "未找到 Docker Compose。"
  fi
}

load_existing_port(){
  if [[ -z "${PORT_OVERRIDE:-}" && -r "$INSTALL_DIR/.env" ]]; then
    local saved
    saved=$(awk -F= '$1=="PORT" {print $2; exit}' "$INSTALL_DIR/.env")
    [[ "$saved" =~ ^[0-9]+$ ]] && PORT="$saved"
  fi
}

install_docker(){
  if command -v docker >/dev/null 2>&1 && { docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; }; then
    return
  fi
  info "Docker Compose 未安装，正在安装..."
  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y ca-certificates curl docker.io docker-compose
    systemctl enable --now docker 2>/dev/null || true
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y ca-certificates curl docker docker-compose-plugin
    systemctl enable --now docker 2>/dev/null || true
  elif command -v yum >/dev/null 2>&1; then
    yum install -y ca-certificates curl docker docker-compose-plugin
    systemctl enable --now docker 2>/dev/null || true
  else
    fail "无法识别包管理器，请先安装 Docker 与 Docker Compose。"
  fi
  docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || fail "Docker Compose 安装失败。"
}

download_release(){
  local tmp archive url
  tmp=$(mktemp -d /tmp/vps-value-install.XXXXXX)
  archive="$tmp/source.tar.gz"
  url="https://github.com/${REPO}/archive/refs/heads/main.tar.gz"
  info "下载 ${REPO} main..."
  curl -fsSL --retry 3 "$url" -o "$archive"
  tar -xzf "$archive" -C "$tmp"
  mkdir -p "$INSTALL_DIR"
  find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "$tmp"/vps-value-main/. "$INSTALL_DIR"/
  rm -rf "$tmp"
}

write_env(){ printf 'PORT=%s\n' "$PORT" > "$INSTALL_DIR/.env"; }

install_app(){
  load_existing_port
  install_docker
  download_release
  write_env
  cd "$INSTALL_DIR"
  compose up -d --build --remove-orphans
  info "等待健康检查..."
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
      info "部署成功: http://$(hostname -I | awk '{print $1}'):${PORT}"
      return
    fi
    sleep 2
  done
  compose logs --tail=80
  fail "服务未通过健康检查。"
}

case "$ACTION" in
  install|update) install_app ;;
  status)
    [[ -d "$INSTALL_DIR" ]] || fail "尚未安装。"
    load_existing_port
    cd "$INSTALL_DIR"; compose ps; curl -fsS "http://127.0.0.1:${PORT}/api/health"; echo
    ;;
  logs)
    cd "$INSTALL_DIR"; compose logs -f --tail=100
    ;;
  uninstall)
    if [[ -d "$INSTALL_DIR" ]]; then cd "$INSTALL_DIR"; compose down --rmi local --remove-orphans || true; fi
    rm -rf "$INSTALL_DIR"
    info "已卸载 VPS_VALUE，Docker 本身未删除。"
    ;;
  *) fail "用法: $0 {install|update|status|logs|uninstall}" ;;
esac
