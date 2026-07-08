#!/bin/bash
# ============================================================
#  SETUP LAVOIE MEET — Jitsi Meet sou pò 8443
#  Sèvè: Contabo VPS (Ubuntu 24.04) — AzuraCast PA touche
#  Les Membres de La Voie — lavoie.world
# ============================================================
set -e

DOMAIN="meet.lavoie.world"
SERVER_IP="207.180.215.237"
HTTPS_PORT="8443"
CERT_DIR="/etc/ssl/lavoie-meet"

BLEU='\033[0;34m'; VET='\033[0;32m'; WOUJ='\033[0;31m'; JON='\033[1;33m'; NC='\033[0m'

echo -e "${BLEU}============================================================${NC}"
echo -e "${BLEU}   ENSTALASYON LAVOIE MEET — meet.lavoie.world:8443${NC}"
echo -e "${BLEU}============================================================${NC}"

if [ "$(id -u)" -ne 0 ]; then
  echo -e "${WOUJ}Egzekite script la kòm root: sudo bash setup-lavoie-meet.sh${NC}"
  exit 1
fi

# ---------- 0. Enfòmasyon nou bezwen ----------
echo ""
echo -e "${JON}Mwen bezwen 3 enfòmasyon (yo rete sou sèvè a sèlman):${NC}"
read -p "Imèl pou Let's Encrypt: " LE_EMAIL < /dev/tty
read -p "Porkbun API Key (kòmanse ak pk1_): " PB_KEY < /dev/tty
read -p "Porkbun Secret API Key (kòmanse ak sk1_): " PB_SECRET < /dev/tty

if [ -z "$LE_EMAIL" ] || [ -z "$PB_KEY" ] || [ -z "$PB_SECRET" ]; then
  echo -e "${WOUJ}Youn nan repons yo vid. Rekòmanse script la.${NC}"
  exit 1
fi

# ---------- 1. Verifye DNS ----------
echo ""
echo -e "${BLEU}[1/9] Verifikasyon DNS pou ${DOMAIN}...${NC}"
apt-get update -qq
apt-get install -y -qq dnsutils curl gnupg2 apt-transport-https >/dev/null
RESOLVED=$(dig +short A ${DOMAIN} @1.1.1.1 | tail -n1)
if [ "$RESOLVED" != "$SERVER_IP" ]; then
  echo -e "${WOUJ}ATANSYON: ${DOMAIN} pwente sou '${RESOLVED:-anyen}' olye de ${SERVER_IP}.${NC}"
  echo -e "${JON}Ale sou Porkbun → lavoie.world → DNS → kreye rekò A: 'meet' → ${SERVER_IP}${NC}"
  read -p "Kontinye kanmenm? (o/n): " REP < /dev/tty
  [ "$REP" != "o" ] && exit 1
else
  echo -e "${VET}✓ DNS kòrèk: ${DOMAIN} → ${SERVER_IP}${NC}"
fi

# ---------- 2. Netwaye ansyen tantativ (8081, elatriye) ----------
echo ""
echo -e "${BLEU}[2/9] Netwayaj ansyen enstalasyon Jitsi...${NC}"
systemctl stop jitsi-videobridge2 jicofo prosody 2>/dev/null || true
apt-get purge -y -qq jitsi-meet jitsi-meet-web jitsi-meet-web-config \
  jitsi-meet-prosody jitsi-meet-turnserver jitsi-videobridge2 jicofo \
  prosody prosody-modules coturn 2>/dev/null || true
rm -rf /etc/jitsi /etc/prosody /var/lib/prosody
rm -f /etc/nginx/sites-enabled/*jitsi* /etc/nginx/sites-available/*jitsi* \
      /etc/nginx/sites-enabled/${DOMAIN}.conf /etc/nginx/sites-available/${DOMAIN}.conf \
      /etc/nginx/modules-enabled/60-jitsi-meet.conf 2>/dev/null || true
apt-get autoremove -y -qq >/dev/null || true
echo -e "${VET}✓ Netwayaj fini${NC}"

# ---------- 3. Sètifika pwovizwa (pou nginx ka demare) ----------
echo ""
echo -e "${BLEU}[3/9] Sètifika pwovizwa...${NC}"
mkdir -p ${CERT_DIR}
if [ ! -f ${CERT_DIR}/fullchain.pem ]; then
  openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
    -keyout ${CERT_DIR}/privkey.pem -out ${CERT_DIR}/fullchain.pem \
    -subj "/CN=${DOMAIN}" >/dev/null 2>&1
fi
echo -e "${VET}✓ OK${NC}"

# ---------- 4. Enstale Jitsi Meet (san kesyon) ----------
echo ""
echo -e "${BLEU}[4/9] Enstalasyon Jitsi Meet (sa ka pran 3-5 minit)...${NC}"
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor > /usr/share/keyrings/jitsi-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/" > /etc/apt/sources.list.d/jitsi-stable.list
apt-get update -qq

echo "jitsi-videobridge2 jitsi-videobridge/jvb-hostname string ${DOMAIN}" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select I want to use my own certificate" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-path-key string ${CERT_DIR}/privkey.pem" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-path-crt string ${CERT_DIR}/fullchain.pem" | debconf-set-selections

# nginx ap eseye pran pò 80/443 (AzuraCast kenbe yo) — nou kite l echwe, n ap ranje sa apre
DEBIAN_FRONTEND=noninteractive apt-get install -y jitsi-meet || true
echo -e "${VET}✓ Pakè Jitsi enstale${NC}"

# ---------- 5. Rekonfigire nginx sou pò 8443 SÈLMAN ----------
echo ""
echo -e "${BLEU}[5/9] Konfigirasyon nginx sou pò ${HTTPS_PORT} (san touche 80/443 AzuraCast)...${NC}"

# Retire modil "stream" Jitsi a ki pran pò 443
rm -f /etc/nginx/modules-enabled/60-jitsi-meet.conf

# Reekri konfigirasyon sit la nèt — vèsyon pwòp sou 8443
cat > /etc/nginx/sites-available/${DOMAIN}.conf <<NGINXEOF
server_names_hash_bucket_size 64;

types {
    application/wasm wasm;
}

server {
    listen ${HTTPS_PORT} ssl;
    listen [::]:${HTTPS_PORT} ssl;
    http2 on;
    server_name ${DOMAIN};

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    root /usr/share/jitsi-meet;
    index index.html index.htm;
    error_page 404 /static/404.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/x-icon application/octet-stream application/wasm;
    gzip_vary on;
    gzip_min_length 860;

    location = /config.js {
        alias /etc/jitsi/meet/${DOMAIN}-config.js;
    }

    location = /external_api.js {
        alias /usr/share/jitsi-meet/libs/external_api.min.js;
    }

    location = /interface_config.js {
        alias /usr/share/jitsi-meet/interface_config.js;
    }

    location ~ ^/(libs|css|static|images|fonts|lang|sounds|connection_optimization|.well-known)/(.*)\$ {
        add_header 'Access-Control-Allow-Origin' '*';
        alias /usr/share/jitsi-meet/\$1/\$2;
        if (\$arg_v) { expires 1y; }
    }

    # BOSH
    location = /http-bind {
        proxy_pass http://127.0.0.1:5280/http-bind;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header Host \$http_host;
    }

    # xmpp websockets
    location = /xmpp-websocket {
        proxy_pass http://127.0.0.1:5280/xmpp-websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
        tcp_nodelay on;
    }

    # colibri (JVB) websockets
    location ~ ^/colibri-ws/([a-zA-Z0-9-\\.]+)/(.*) {
        proxy_pass http://127.0.0.1:9090/colibri-ws/\$1/\$2\$is_args\$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        tcp_nodelay on;
    }

    # sal reyinyon yo (ex: /LesMembresDeLaVoieQehilah)
    location ~ ^/([^/?&:'"]+)\$ {
        try_files \$uri @root_path;
    }

    location @root_path {
        rewrite ^/(.*)\$ / break;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/${DOMAIN}.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx >/dev/null 2>&1
systemctl restart nginx
echo -e "${VET}✓ nginx ap koute sou pò ${HTTPS_PORT}${NC}"

# ---------- 6. Ajiste konfigirasyon Jitsi pou pò 8443 ----------
echo ""
echo -e "${BLEU}[6/9] Ajisteman Jitsi pou pò ${HTTPS_PORT}...${NC}"

CFG="/etc/jitsi/meet/${DOMAIN}-config.js"
if [ -f "$CFG" ]; then
  sed -i "s|wss://${DOMAIN}/xmpp-websocket|wss://${DOMAIN}:${HTTPS_PORT}/xmpp-websocket|g" "$CFG"
  sed -i "s|//${DOMAIN}/http-bind|//${DOMAIN}:${HTTPS_PORT}/http-bind|g" "$CFG"
fi

JVB="/etc/jitsi/videobridge/jvb.conf"
if [ -f "$JVB" ]; then
  sed -i "s|domain = \"${DOMAIN}:443\"|domain = \"${DOMAIN}:${HTTPS_PORT}\"|g" "$JVB"
fi
echo -e "${VET}✓ OK${NC}"

# ---------- 7. Sètifika Let's Encrypt (DNS challenge Porkbun) ----------
echo ""
echo -e "${BLEU}[7/9] Sètifika SSL Let's Encrypt atravè Porkbun...${NC}"
if [ ! -d /root/.acme.sh ]; then
  curl -s https://get.acme.sh | sh -s email="${LE_EMAIL}" >/dev/null
fi
export PORKBUN_API_KEY="${PB_KEY}"
export PORKBUN_SECRET_API_KEY="${PB_SECRET}"

/root/.acme.sh/acme.sh --issue --dns dns_porkbun -d ${DOMAIN} --server letsencrypt --force || {
  echo -e "${WOUJ}Echèk sètifika a. Verifye: (1) API Access aktive pou lavoie.world nan Porkbun,${NC}"
  echo -e "${WOUJ}(2) kle API yo kòrèk. Sit la ap mache ak sètifika pwovizwa a pou kounye a.${NC}"
}

/root/.acme.sh/acme.sh --install-cert -d ${DOMAIN} \
  --key-file ${CERT_DIR}/privkey.pem \
  --fullchain-file ${CERT_DIR}/fullchain.pem \
  --reloadcmd "systemctl reload nginx" 2>/dev/null || true

systemctl reload nginx
echo -e "${VET}✓ Sètifika enstale (renouvèlman otomatik chak 60 jou)${NC}"

# ---------- 8. Firewall ----------
echo ""
echo -e "${BLEU}[8/9] Firewall...${NC}"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow 2022/tcp >/dev/null 2>&1 || true
  ufw allow ${HTTPS_PORT}/tcp >/dev/null 2>&1 || true
  ufw allow 10000/udp >/dev/null 2>&1 || true
  echo -e "${VET}✓ Règ firewall ajoute (eta ufw pa chanje)${NC}"
else
  echo -e "${VET}✓ Pa gen ufw — pò yo louvri deja${NC}"
fi

# ---------- 9. Redemaraj sèvis yo + rapò ----------
echo ""
echo -e "${BLEU}[9/9] Redemaraj sèvis Jitsi yo...${NC}"
systemctl restart prosody jicofo jitsi-videobridge2 nginx
sleep 5

echo ""
echo -e "${BLEU}============================================================${NC}"
echo -e "${BLEU}                    RAPÒ FINAL${NC}"
echo -e "${BLEU}============================================================${NC}"
for SVC in prosody jicofo jitsi-videobridge2 nginx; do
  if systemctl is-active --quiet $SVC; then
    echo -e "  ${VET}✓ $SVC : AKTIF${NC}"
  else
    echo -e "  ${WOUJ}✗ $SVC : PA MACHE${NC}"
  fi
done
echo ""
echo "  Pò k ap koute:"
ss -tlnp | grep -E ":(80|443|${HTTPS_PORT}|5280) " | awk '{print "    " $4 "  (" $6 ")"}' | head -10
echo ""
echo "  Memwa:"
free -h | awk 'NR<=2 {print "    " $0}'
echo ""
echo -e "${VET}============================================================${NC}"
echo -e "${VET}  LAVOIE MEET PARE! Teste li:${NC}"
echo -e "${VET}  https://${DOMAIN}:${HTTPS_PORT}/LesMembresDeLaVoieQehilah${NC}"
echo -e "${VET}============================================================${NC}"
echo ""
echo "  Si gen yon liy WOUJ pi wo a, voye foto rapò sa a bay Claude."
