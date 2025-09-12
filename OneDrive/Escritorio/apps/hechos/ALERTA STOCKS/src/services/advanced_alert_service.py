"""
Advanced Alert service: CRUD and evaluation for percentage and technical alerts
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from src.models.advanced_alert_schemas import (
    AdvancedAlertCreate,
    AdvancedAlertUpdate,
    AdvancedAlertResponse,
    AdvancedAlertStats,
)
from src.utils.database import get_db_connection
from src.services.price_service import PriceService, AssetType
from src.services.alpha_vantage_service import alpha_vantage_service
from src.services.coingecko_service import coingecko_service


logger = logging.getLogger(__name__)


class AdvancedAlertService:
    price_service = PriceService()

    # CRUD
    @staticmethod
    async def create_alert(data: AdvancedAlertCreate) -> AdvancedAlertResponse:
        conn = await get_db_connection()

        conditions = dict(data.conditions)
        # If percentage alert with baseline comparison and base_price not provided, capture current price
        if (
            data.alert_type == "percentage_change"
            and conditions.get("comparison_base") == "baseline"
            and "base_price" not in conditions
        ):
            asset_type = AssetType.STOCK if data.asset_type == "stock" else AssetType.CRYPTO
            price = await AdvancedAlertService.price_service.get_price(data.asset_symbol, asset_type)
            conditions["base_price"] = float(price.current_price)

        query = """
            INSERT INTO advanced_alerts (
                asset_symbol, asset_type, alert_type, alert_name, conditions, timeframe,
                check_frequency_minutes, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """
        now = datetime.now(timezone.utc).isoformat()
        cursor = await conn.execute(
            query,
            (
                data.asset_symbol,
                data.asset_type,
                data.alert_type,
                data.alert_name,
                json.dumps(conditions),
                data.timeframe,
                5,
                now,
            ),
        )
        await conn.commit()
        alert_id = cursor.lastrowid
        return AdvancedAlertResponse(
            id=alert_id,
            asset_symbol=data.asset_symbol,
            asset_type=data.asset_type,
            alert_type=data.alert_type,
            timeframe=data.timeframe,
            conditions=conditions,
            is_active=True,
            created_at=datetime.fromisoformat(now),
            last_triggered=None,
            last_checked=None,
            trigger_count=0,
            alert_name=data.alert_name,
            description=data.description,
            max_triggers=None,
        )

    @staticmethod
    async def get_alert(alert_id: int) -> Optional[AdvancedAlertResponse]:
        conn = await get_db_connection()
        cursor = await conn.execute("SELECT * FROM advanced_alerts WHERE id = ?", (alert_id,))
        row = await cursor.fetchone()
        await cursor.close()
        if not row:
            return None
        return AdvancedAlertService._row_to_response(row)

    @staticmethod
    async def list_alerts(active_only: bool = False) -> List[AdvancedAlertResponse]:
        conn = await get_db_connection()
        if active_only:
            cursor = await conn.execute("SELECT * FROM advanced_alerts WHERE is_active = 1 ORDER BY created_at DESC")
        else:
            cursor = await conn.execute("SELECT * FROM advanced_alerts ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        await cursor.close()
        return [AdvancedAlertService._row_to_response(r) for r in rows]

    @staticmethod
    async def update_alert(alert_id: int, data: AdvancedAlertUpdate) -> Optional[AdvancedAlertResponse]:
        current = await AdvancedAlertService.get_alert(alert_id)
        if not current:
            return None
        conn = await get_db_connection()

        update_fields = []
        values: List[Any] = []
        if data.asset_symbol is not None:
            update_fields.append("asset_symbol = ?")
            values.append(data.asset_symbol)
        if data.asset_type is not None:
            update_fields.append("asset_type = ?")
            values.append(data.asset_type)
        if data.timeframe is not None:
            update_fields.append("timeframe = ?")
            values.append(data.timeframe)
        if data.conditions is not None:
            update_fields.append("conditions = ?")
            values.append(json.dumps(data.conditions))
        if data.alert_name is not None:
            update_fields.append("alert_name = ?")
            values.append(data.alert_name)
        if data.description is not None:
            update_fields.append("description = ?")
            values.append(data.description)
        if data.is_active is not None:
            update_fields.append("is_active = ?")
            values.append(1 if data.is_active else 0)
        if data.max_triggers is not None:
            update_fields.append("max_triggers = ?")
            values.append(data.max_triggers)

        if not update_fields:
            return current

        values.append(alert_id)
        await conn.execute(f"UPDATE advanced_alerts SET {', '.join(update_fields)} WHERE id = ?", tuple(values))
        await conn.commit()
        return await AdvancedAlertService.get_alert(alert_id)

    @staticmethod
    async def delete_alert(alert_id: int) -> bool:
        conn = await get_db_connection()
        cursor = await conn.execute("DELETE FROM advanced_alerts WHERE id = ?", (alert_id,))
        await conn.commit()
        return cursor.rowcount > 0

    @staticmethod
    async def toggle_alert(alert_id: int) -> Optional[AdvancedAlertResponse]:
        current = await AdvancedAlertService.get_alert(alert_id)
        if not current:
            return None
        conn = await get_db_connection()
        new_state = 0 if current.is_active else 1
        await conn.execute("UPDATE advanced_alerts SET is_active = ? WHERE id = ?", (new_state, alert_id))
        await conn.commit()
        return await AdvancedAlertService.get_alert(alert_id)

    @staticmethod
    async def stats() -> AdvancedAlertStats:
        conn = await get_db_connection()
        cursor = await conn.execute(
            """
            SELECT 
                COUNT(1),
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END),
                SUM(CASE WHEN alert_type = 'percentage_change' THEN 1 ELSE 0 END),
                SUM(CASE WHEN alert_type = 'technical_indicator' THEN 1 ELSE 0 END)
            FROM advanced_alerts
            """
        )
        row = await cursor.fetchone()
        await cursor.close()
        total = row[0] or 0
        active = row[1] or 0
        pct = row[2] or 0
        tech = row[3] or 0
        # triggered_today: count history today
        cursor2 = await conn.execute(
            "SELECT COUNT(1) FROM alert_trigger_history WHERE date(triggered_at) = date('now')"
        )
        row2 = await cursor2.fetchone()
        await cursor2.close()
        trig_today = row2[0] or 0
        return AdvancedAlertStats(
            total_alerts=total,
            active_alerts=active,
            triggered_today=trig_today,
            percentage_alerts=pct,
            technical_alerts=tech,
        )

    # Evaluation
    @staticmethod
    async def evaluate_and_maybe_trigger(alert_row: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate an advanced alert. Returns (triggered, context)"""
        alert_type = alert_row["alert_type"]
        conditions = json.loads(alert_row["conditions"]) if isinstance(alert_row["conditions"], str) else alert_row["conditions"]
        asset_symbol = alert_row["asset_symbol"]
        asset_type = AssetType.STOCK if alert_row["asset_type"] == "stock" else AssetType.CRYPTO

        if alert_type == "percentage_change":
            return await AdvancedAlertService._eval_percentage_change(asset_symbol, asset_type, conditions)
        elif alert_type == "technical_indicator":
            return await AdvancedAlertService._eval_technical_indicator(asset_symbol, asset_type, conditions)
        else:
            logger.warning(f"Unsupported advanced alert type: {alert_type}")
            return False, {"reason": "unsupported_type"}

    @staticmethod
    async def _eval_percentage_change(symbol: str, asset_type: AssetType, cond: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate percentage change alert.
        Supports: comparison_base in ['previous_close','24h','baseline'] and direction 'up'|'down'|'any'.
        """
        direction = cond.get("direction", "any")
        threshold = float(cond.get("change_percentage", 0))
        comparison_base = cond.get("comparison_base", "24h")

        if comparison_base == "baseline":
            price = await AdvancedAlertService.price_service.get_price(symbol, asset_type)
            base = float(cond.get("base_price", price.current_price))
            change_pct = ((price.current_price - base) / base) * 100 if base else 0.0
            ctx = {"current_price": price.current_price, "base_price": base, "change_pct": change_pct}
        elif asset_type == AssetType.STOCK and comparison_base == "previous_close":
            gq = await alpha_vantage_service.get_global_quote(symbol)
            price_now = gq.get("price")
            prev_close = gq.get("previous_close")
            change_pct = ((price_now - prev_close) / prev_close) * 100 if prev_close else 0.0
            ctx = {"current_price": price_now, "previous_close": prev_close, "change_pct": change_pct}
        else:
            # Default for crypto: 24h change via CoinGecko
            cg = await coingecko_service.get_crypto_price_with_change(symbol)
            change_pct = cg["change_24h"]
            ctx = {"current_price": cg["price"], "change_pct": change_pct}

        meets = (
            (direction == "up" and change_pct >= threshold)
            or (direction == "down" and change_pct <= -abs(threshold))
            or (direction == "any" and (abs(change_pct) >= abs(threshold)))
        )
        return meets, ctx

    @staticmethod
    async def _eval_technical_indicator(symbol: str, asset_type: AssetType, cond: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        indicator = cond.get("indicator")
        operator = cond.get("operator", "greater_than")
        threshold = float(cond.get("threshold", 0))
        period = int(cond.get("period", 14))

        if asset_type != AssetType.STOCK:
            # For simplicity, only stock indicators via Alpha Vantage supported initially
            return False, {"reason": "indicators_supported_for_stocks_only"}

        # Handle operators including cross detection (requires last two points)
        if indicator == "rsi":
            if operator in ("crosses_above", "crosses_below"):
                series = await alpha_vantage_service.get_rsi_series(symbol, interval="daily", time_period=period, points=2)
                if len(series) < 2:
                    return False, {"reason": "insufficient_points"}
                prev, curr = series[0], series[1]
            else:
                curr = await alpha_vantage_service.get_rsi(symbol, interval="daily", time_period=period)
                prev = None
        elif indicator == "sma":
            if operator in ("crosses_above", "crosses_below"):
                series = await alpha_vantage_service.get_sma_series(symbol, interval="daily", time_period=period, points=2)
                if len(series) < 2:
                    return False, {"reason": "insufficient_points"}
                prev, curr = series[0], series[1]
            else:
                curr = await alpha_vantage_service.get_sma(symbol, interval="daily", time_period=period)
                prev = None
        else:
            return False, {"reason": f"unsupported_indicator:{indicator}"}

        meets = False
        if operator == "greater_than":
            meets = curr >= threshold
        elif operator == "less_than":
            meets = curr <= threshold
        elif operator == "crosses_above" and prev is not None:
            meets = prev < threshold <= curr
        elif operator == "crosses_below" and prev is not None:
            meets = prev > threshold >= curr

        return meets, {"indicator": indicator, "value": curr, "prev": prev, "threshold": threshold, "operator": operator}

    @staticmethod
    def _row_to_response(row) -> AdvancedAlertResponse:
        # row columns follow creation order; fetch by index
        conditions = row[5]
        if isinstance(conditions, str):
            try:
                conditions = json.loads(conditions)
            except Exception:
                conditions = {}
        return AdvancedAlertResponse(
            id=row[0],
            asset_symbol=row[1],
            asset_type=row[2],
            alert_type=row[3],
            alert_name=row[4],
            conditions=conditions,
            timeframe=row[6],
            is_active=bool(row[8]),
            created_at=datetime.fromisoformat(row[9]) if isinstance(row[9], str) else (row[9] or datetime.now(timezone.utc)),
            last_triggered=row[10],
            last_checked=row[11],
            trigger_count=row[12] or 0,
            description=row[16],
            max_triggers=row[15],
        )
