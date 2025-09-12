"""
Test cases for Alert model and basic validation
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from src.models.alert import Alert
from src.models.schemas import AlertCreate, AlertUpdate, AlertResponse


class TestAlert:
    """Test cases for Alert model"""
    
    def test_alert_creation(self):
        """Test Alert model creation with valid data"""
        alert = Alert(
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        assert alert.asset_symbol == "AAPL"
        assert alert.asset_type == "stock"
        assert alert.condition_type == ">="
        assert alert.threshold_price == 150.00
        assert alert.is_active is True
        assert isinstance(alert.created_at, datetime)
    
    def test_alert_str_representation(self):
        """Test Alert string representation"""
        alert = Alert(
            asset_symbol="BTC",
            asset_type="crypto",
            condition_type="<=",
            threshold_price=45000.00,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        expected = "BTC (crypto) <= $45000.00 [Active]"
        assert str(alert) == expected
    
    def test_alert_repr_representation(self):
        """Test Alert repr representation"""
        alert = Alert(
            id=1,
            asset_symbol="ETH",
            asset_type="crypto",
            condition_type=">=",
            threshold_price=3000.00,
            is_active=False,
            created_at=datetime.utcnow()
        )
        
        expected = ("<Alert(id=1, asset_symbol='ETH', asset_type='crypto', "
                   "condition='>=', threshold=3000.0, active=False)>")
        assert repr(alert) == expected
    
    def test_is_in_cooldown_no_trigger(self):
        """Test cooldown check when alert was never triggered"""
        alert = Alert(
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=True,
            created_at=datetime.utcnow(),
            last_triggered=None
        )
        
        assert alert.is_in_cooldown is False
    
    def test_is_in_cooldown_recent_trigger(self):
        """Test cooldown check when alert was recently triggered"""
        recent_trigger = datetime.utcnow() - timedelta(hours=1)
        
        alert = Alert(
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=True,
            created_at=datetime.utcnow(),
            last_triggered=recent_trigger
        )
        
        assert alert.is_in_cooldown is True
    
    def test_is_in_cooldown_old_trigger(self):
        """Test cooldown check when alert was triggered long ago"""
        old_trigger = datetime.utcnow() - timedelta(hours=5)
        
        alert = Alert(
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=True,
            created_at=datetime.utcnow(),
            last_triggered=old_trigger
        )
        
        assert alert.is_in_cooldown is False
    
    def test_can_trigger_active_no_cooldown(self):
        """Test can_trigger when alert is active and not in cooldown"""
        alert = Alert(
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=True,
            created_at=datetime.utcnow(),
            last_triggered=None
        )
        
        assert alert.can_trigger is True
    
    def test_can_trigger_inactive(self):
        """Test can_trigger when alert is inactive"""
        alert = Alert(
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=False,
            created_at=datetime.utcnow(),
            last_triggered=None
        )
        
        assert alert.can_trigger is False
    
    def test_can_trigger_in_cooldown(self):
        """Test can_trigger when alert is in cooldown"""
        recent_trigger = datetime.utcnow() - timedelta(hours=1)
        
        alert = Alert(
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=True,
            created_at=datetime.utcnow(),
            last_triggered=recent_trigger
        )
        
        assert alert.can_trigger is False
    
    def test_to_dict(self):
        """Test Alert to_dict conversion"""
        created_time = datetime.utcnow()
        triggered_time = created_time + timedelta(hours=1)
        
        alert = Alert(
            id=1,
            asset_symbol="AAPL",
            asset_type="stock",
            condition_type=">=",
            threshold_price=150.00,
            is_active=True,
            created_at=created_time,
            last_triggered=triggered_time
        )
        
        result = alert.to_dict()
        
        assert result['id'] == 1
        assert result['asset_symbol'] == "AAPL"
        assert result['asset_type'] == "stock"
        assert result['condition_type'] == ">="
        assert result['threshold_price'] == 150.00
        assert result['is_active'] is True
        assert result['created_at'] == created_time.isoformat()
        assert result['last_triggered'] == triggered_time.isoformat()
        assert 'is_in_cooldown' in result
        assert 'can_trigger' in result




# Schema validation tests
class TestSchemas:
    """Test cases for Pydantic schemas"""
    
    def test_alert_create_valid(self):
        """Test AlertCreate with valid data"""
        data = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": 150.00
        }
        
        alert = AlertCreate(**data)
        assert alert.asset_symbol == "AAPL"
        assert alert.asset_type == "stock"
        assert alert.condition_type == ">="
        assert alert.threshold_price == 150.00
    
    def test_alert_create_invalid_asset_type(self):
        """Test AlertCreate with invalid asset type"""
        with pytest.raises(ValueError):
            AlertCreate(
                asset_symbol="AAPL",
                asset_type="invalid",
                condition_type=">=",
                threshold_price=150.00
            )
    
    def test_alert_create_invalid_condition_type(self):
        """Test AlertCreate with invalid condition type"""
        with pytest.raises(ValueError):
            AlertCreate(
                asset_symbol="AAPL",
                asset_type="stock",
                condition_type="!=",
                threshold_price=150.00
            )
    
    def test_alert_create_invalid_price(self):
        """Test AlertCreate with invalid price"""
        with pytest.raises(ValueError):
            AlertCreate(
                asset_symbol="AAPL",
                asset_type="stock",
                condition_type=">=",
                threshold_price=-10.00
            )
    
    def test_alert_create_asset_symbol_validation(self):
        """Test asset symbol validation"""
        # Valid symbols
        valid_symbols = ["AAPL", "BTC", "ETH-USD", "GOOGL.A", "SPX_500"]
        for symbol in valid_symbols:
            alert = AlertCreate(
                asset_symbol=symbol,
                asset_type="stock",
                condition_type=">=",
                threshold_price=150.00
            )
            assert alert.asset_symbol == symbol.upper()
        
        # Invalid symbols
        with pytest.raises(ValueError):
            AlertCreate(
                asset_symbol="A@PL",  # Invalid character @
                asset_type="stock",
                condition_type=">=",
                threshold_price=150.00
            )
    
    def test_alert_update_partial(self):
        """Test AlertUpdate with partial data"""
        update = AlertUpdate(threshold_price=160.00)
        assert update.threshold_price == 160.00
        assert update.asset_symbol is None
        assert update.is_active is None