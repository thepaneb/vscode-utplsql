@echo off
rem ---------------------------------------------------------------------------
rem MCP do Obsidian - corrige o portproxy do Windows (WSL -> plugin Local REST API).
rem
rem Por que existe: o netsh portproxy deixa de escutar quando o adaptador do WSL e
rem recriado (reinicio/atualizacao do Windows). A regra continua no registro e o
rem iphlpsvc continua rodando, mas o listener nao e vinculado - a porta passa a
rem ser recusada, mesmo com a sub-rede igual. O bridge scripts/obsidian-mcp.py
rem entao nao alcanca o Obsidian e o MCP cai com "Request timed out".
rem
rem Uso: duplo-clique neste arquivo (pede elevacao de administrador).
rem Passo seguinte (no WSL) e detalhes:
rem docs/brain/11-Stack/Guia - ferramentas de agente (MCPs, skills e plugins).md
rem ---------------------------------------------------------------------------
setlocal EnableExtensions
set "PORT=27123"
set "RULE=Obsidian MCP %PORT%"

rem --- portproxy e firewall exigem admin: re-executa elevado ---
net session >nul 2>&1
if errorlevel 1 (
  echo Solicitando privilegios de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
  exit /b 0
)

rem --- IPv4 + prefixo do adaptador de rede do WSL ---
set "WSLIP="
set "PREFIX="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$a=Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias.StartsWith('vEthernet') -and $_.InterfaceAlias.Contains('WSL') } | Select-Object -First 1; '{0}|{1}' -f $a.IPAddress,$a.PrefixLength"`) do for /f "tokens=1,2 delims=|" %%A in ("%%I") do (
  set "WSLIP=%%A"
  set "PREFIX=%%B"
)

if not defined WSLIP (
  echo [erro] Adaptador de rede do WSL nao encontrado.
  echo        Abra o WSL uma vez ^(wsl -e true^) e rode este script de novo.
  echo.
  pause
  exit /b 1
)

rem --- sub-rede do WSL (usada na regra de firewall) ---
set "SUBNET="
for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$p='%WSLIP%'.Split('.'); $v=[uint32]$p[0]*16777216+[uint32]$p[1]*65536+[uint32]$p[2]*256+[uint32]$p[3]; $sh=32-%PREFIX%; $m=[uint32]::MaxValue -shl $sh; $n=$v -band $m; $a=$n -shr 24 -band 255; $b=$n -shr 16 -band 255; $c=$n -shr 8 -band 255; $d=$n -band 255; '{0}.{1}.{2}.{3}/{4}' -f $a,$b,$c,$d,%PREFIX%"`) do set "SUBNET=%%S"

echo Adaptador WSL : %WSLIP%/%PREFIX%
echo Sub-rede      : %SUBNET%
echo.

rem --- portproxy: delete + add forca o re-bind do listener ---
netsh interface portproxy delete v4tov4 listenaddress=%WSLIP% listenport=%PORT% >nul 2>&1
netsh interface portproxy add v4tov4 listenaddress=%WSLIP% listenport=%PORT% connectaddress=127.0.0.1 connectport=%PORT%
if errorlevel 1 (
  echo [erro] Falha ao reaplicar o portproxy.
  echo.
  pause
  exit /b 1
)
echo [ok] Portproxy: %WSLIP%:%PORT% -^> 127.0.0.1:%PORT%

rem --- firewall: regra idempotente para a sub-rede atual ---
netsh advfirewall firewall delete rule name="%RULE%" >nul 2>&1
netsh advfirewall firewall add rule name="%RULE%" dir=in action=allow protocol=TCP localport=%PORT% remoteip=%SUBNET% >nul
if errorlevel 1 (
  echo [aviso] Nao consegui recriar a regra de firewall "%RULE%".
) else (
  echo [ok] Firewall: regra "%RULE%" liberando %SUBNET%
)

rem --- confere o listener ---
netstat -ano | findstr "%WSLIP%:%PORT%" | findstr LISTENING >nul
if errorlevel 1 (
  echo [aviso] Listener ainda nao visivel; confira: netstat -ano ^| findstr %PORT%
) else (
  echo [ok] Listener ativo em %WSLIP%:%PORT%
)

echo.
echo Pronto. No WSL, reconecte o MCP sem reiniciar o servico - veja a secao
echo "Obsidian MCP" do AGENTS.md ^(POST /api/experimental/mcp/obsidian/connect^).
echo.
pause
exit /b 0
