# 🚀 Guía de Inicio Rápido - Price Monitor

**¡Tu aplicación está casi lista!** Solo necesitas configurar 3 cosas y ya podrás recibir alertas de precios por WhatsApp.

## ⚡ Pasos Inmediatos (5 minutos)

### 1. 📱 **Configurar tu número de WhatsApp**

Edita el archivo `.env` y cambia esta línea:
```env
# Cambia esto:
WHATSAPP_NUMBER=+1234567890

# Por tu número real (ejemplo):
WHATSAPP_NUMBER=+34612345678  # España
# o
WHATSAPP_NUMBER=+528123456789 # México
# o
WHATSAPP_NUMBER=+5491123456789 # Argentina
```

### 2. 🔑 **Conseguir API Key de Alpha Vantage (GRATIS)**

1. **Ve a**: https://www.alphavantage.co/support/#api-key
2. **Regístrate gratis** (solo email)
3. **Copia tu API key** 
4. **Pégala en `.env`**:
```env
# Cambia esto:
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# Por tu key real:
ALPHA_VANTAGE_API_KEY=ABCD1234EFGH5678
```

### 3. 📞 **Configurar Twilio para WhatsApp (GRATIS para pruebas)**

**Opción A: Solo para pruebas (GRATIS)**
1. Ve a: https://console.twilio.com/
2. Regístrate gratis
3. Ve a "Develop" → "Messaging" → "Try it out" → "Send a WhatsApp message"
4. Copia tus credenciales:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_token_aqui
```

**Opción B: Sin WhatsApp por ahora**
```env
# Desactivar WhatsApp temporalmente
ENABLE_WHATSAPP=False
```

## 🏃‍♂️ **¡EJECUTAR LA APP!**

```bash
# 1. Activar entorno virtual
.venv\Scripts\activate

# 2. Ejecutar la aplicación
python main.py
```

## 🎯 **Usar la App**

1. **Abrir en navegador**: http://localhost:8000
2. **Crear tu primera alerta**:
   - Asset Symbol: `AAPL` (Apple)
   - Condition: `>=` (mayor o igual)
   - Price: `200` (cuando Apple supere $200)
3. **Hacer clic en "Start"** para comenzar monitoreo

## 📊 **Ejemplos de Alertas**

```
Acciones:
- AAPL >= 200    (Apple sube a $200)
- TSLA <= 150    (Tesla baja a $150)
- GOOGL >= 3000  (Google sube a $3000)

Criptomonedas:
- bitcoin >= 100000    (Bitcoin sube a $100,000)
- ethereum <= 2000     (Ethereum baja a $2,000)
```

## ⚠️ **Solución de Problemas Rápidos**

**❌ "No se puede conectar"**
```bash
# Verificar que el puerto esté libre
netstat -ano | findstr :8000
```

**❌ "Database error"**
```bash
# La app creará automáticamente la base de datos
# Solo asegúrate de que la carpeta 'data' exista
mkdir data
```

**❌ "API key inválida"**
- Verifica que copiaste bien la API key
- No debe tener espacios al principio o final

## 🔥 **Después de configurar**

1. **Monitorear**: Ve a http://localhost:8000/health para ver el estado
2. **Configurar más alertas**: Añade Bitcoin, Ethereum, Tesla, etc.
3. **Probar WhatsApp**: Crea una alerta con precio muy bajo para que se dispare inmediatamente

## 📚 **Documentación Completa**

- [Manual Completo](docs/user-manual.md) - Guía detallada de todas las funciones
- [Solución de Problemas](docs/troubleshooting.md) - Si algo no funciona
- [API Documentation](docs/api.md) - Para desarrolladores

## 🆘 **¿Necesitas Ayuda?**

1. **Revisa logs**: `logs/app.log`
2. **Health dashboard**: http://localhost:8000/health
3. **Troubleshooting guide**: [docs/troubleshooting.md](docs/troubleshooting.md)

---

**¡En 5 minutos estarás recibiendo alertas de precios por WhatsApp!** 🚀📱