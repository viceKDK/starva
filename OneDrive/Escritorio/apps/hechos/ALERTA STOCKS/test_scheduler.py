#!/usr/bin/env python3
"""
Simple test script for the monitoring scheduler
"""

import asyncio
import logging
import sys
from src.services.monitoring_scheduler import MonitoringScheduler

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_scheduler():
    """Test the monitoring scheduler directly"""
    print("Testing monitoring scheduler...")
    
    scheduler = MonitoringScheduler()
    
    try:
        # Test manual trigger
        print("Triggering manual price check...")
        result = await scheduler.trigger_manual_check()
        
        print("Manual check result:")
        print(result)
        
        return True
        
    except Exception as e:
        print(f"Error testing scheduler: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_scheduler())
    sys.exit(0 if success else 1)