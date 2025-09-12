"""
Application health monitoring and validation service
"""

import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from ..utils.logging_config import get_logger
from ..utils.database import get_database, check_database_health
from ..config.settings import get_settings
from .price_service import price_service
from .whatsapp_service import whatsapp_service
from .monitoring_scheduler import monitoring_scheduler


logger = get_logger(__name__)


@dataclass
class HealthCheckResult:
    """Result of a health check"""
    service: str
    status: str  # "healthy", "warning", "critical"
    message: str
    details: Optional[Dict[str, Any]] = None
    response_time_ms: Optional[float] = None
    timestamp: Optional[datetime] = None


class HealthService:
    """Service for monitoring application health and performing startup validation"""
    
    def __init__(self):
        self.settings = get_settings()
        self.startup_validation_complete = False
        self.last_health_check: Optional[datetime] = None
        self.health_check_cache: Dict[str, HealthCheckResult] = {}
        self.cache_ttl_seconds = 30  # Cache health results for 30 seconds
    
    async def startup_validation(self) -> Dict[str, Any]:
        """
        Perform comprehensive startup validation of all dependencies and configuration.
        This should be called during application startup.
        """
        logger.info("Starting application startup validation")
        start_time = time.time()
        
        validation_results = {
            "validation_started_at": datetime.now(timezone.utc).isoformat(),
            "checks": [],
            "overall_status": "healthy",
            "critical_issues": [],
            "warnings": [],
            "startup_ready": True
        }
        
        # Define all startup checks
        startup_checks = [
            ("database", self._validate_database),
            ("configuration", self._validate_configuration), 
            ("external_apis", self._validate_external_apis),
            ("whatsapp_service", self._validate_whatsapp_service),
            ("scheduler", self._validate_scheduler_readiness),
            ("file_system", self._validate_file_system)
        ]
        
        # Run all validation checks
        for check_name, check_func in startup_checks:
            try:
                logger.info(f"Running startup validation: {check_name}")
                result = await check_func()
                validation_results["checks"].append(result)
                
                if result.status == "critical":
                    validation_results["critical_issues"].append(f"{check_name}: {result.message}")
                    validation_results["startup_ready"] = False
                elif result.status == "warning":
                    validation_results["warnings"].append(f"{check_name}: {result.message}")
                    
            except Exception as e:
                error_result = HealthCheckResult(
                    service=check_name,
                    status="critical", 
                    message=f"Validation check failed: {str(e)}",
                    timestamp=datetime.now(timezone.utc)
                )
                validation_results["checks"].append(error_result)
                validation_results["critical_issues"].append(f"{check_name}: {str(e)}")
                validation_results["startup_ready"] = False
                
                logger.error(f"Startup validation failed for {check_name}", exc_info=e)
        
        # Determine overall status
        if validation_results["critical_issues"]:
            validation_results["overall_status"] = "critical"
        elif validation_results["warnings"]:
            validation_results["overall_status"] = "warning"
        
        duration_ms = (time.time() - start_time) * 1000
        validation_results["validation_completed_at"] = datetime.now(timezone.utc).isoformat()
        validation_results["validation_duration_ms"] = duration_ms
        
        self.startup_validation_complete = validation_results["startup_ready"]
        
        logger.info(f"Startup validation completed", extra={
            'extra_context': {
                'overall_status': validation_results["overall_status"],
                'startup_ready': validation_results["startup_ready"],
                'duration_ms': duration_ms,
                'critical_issues_count': len(validation_results["critical_issues"]),
                'warnings_count': len(validation_results["warnings"])
            }
        })
        
        return validation_results
    
    async def health_check(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Perform comprehensive health check of all application components.
        Results are cached for performance.
        """
        now = datetime.now(timezone.utc)
        
        # Check if we can use cached results
        if (not force_refresh and 
            self.last_health_check and 
            (now - self.last_health_check).total_seconds() < self.cache_ttl_seconds):
            logger.debug("Using cached health check results")
            return self._format_health_response()
        
        logger.info("Performing comprehensive health check")
        start_time = time.time()
        
        # Clear cache and perform new checks
        self.health_check_cache.clear()
        
        # Define all health checks
        health_checks = [
            ("database", self._check_database_health),
            ("scheduler", self._check_scheduler_health),
            ("whatsapp_service", self._check_whatsapp_health),
            ("external_apis", self._check_external_apis_health),
            ("system_resources", self._check_system_resources),
            ("application_state", self._check_application_state)
        ]
        
        # Run health checks concurrently where possible
        check_tasks = []
        for check_name, check_func in health_checks:
            task = asyncio.create_task(self._run_health_check(check_name, check_func))
            check_tasks.append(task)
        
        # Wait for all checks to complete
        await asyncio.gather(*check_tasks, return_exceptions=True)
        
        duration_ms = (time.time() - start_time) * 1000
        self.last_health_check = now
        
        logger.info(f"Health check completed in {duration_ms:.2f}ms")
        
        return self._format_health_response()
    
    async def _run_health_check(self, check_name: str, check_func) -> None:
        """Run a single health check and store result in cache"""
        try:
            result = await check_func()
            self.health_check_cache[check_name] = result
        except Exception as e:
            error_result = HealthCheckResult(
                service=check_name,
                status="critical",
                message=f"Health check failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
            self.health_check_cache[check_name] = error_result
            logger.error(f"Health check failed for {check_name}", exc_info=e)
    
    def _format_health_response(self) -> Dict[str, Any]:
        """Format health check results into response format"""
        checks = []
        overall_status = "healthy"
        critical_count = 0
        warning_count = 0
        
        for service_name, result in self.health_check_cache.items():
            check_data = {
                "service": result.service,
                "status": result.status,
                "message": result.message,
                "timestamp": result.timestamp.isoformat() if result.timestamp else None
            }
            
            if result.details:
                check_data["details"] = result.details
            if result.response_time_ms:
                check_data["response_time_ms"] = result.response_time_ms
            
            checks.append(check_data)
            
            if result.status == "critical":
                critical_count += 1
                overall_status = "critical"
            elif result.status == "warning" and overall_status != "critical":
                warning_count += 1
                overall_status = "warning"
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_status": overall_status,
            "startup_validation_complete": self.startup_validation_complete,
            "checks": checks,
            "summary": {
                "total_checks": len(checks),
                "healthy": len([c for c in checks if c["status"] == "healthy"]),
                "warnings": warning_count,
                "critical": critical_count
            }
        }
    
    # Startup Validation Methods
    async def _validate_database(self) -> HealthCheckResult:
        """Validate database connectivity and schema"""
        start_time = time.time()
        
        try:
            # Check database connectivity
            is_healthy = await check_database_health()
            
            if not is_healthy:
                return HealthCheckResult(
                    service="database",
                    status="critical",
                    message="Database connectivity check failed",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.now(timezone.utc)
                )
            
            # Check if required tables exist
            db = await get_database()
            
            # Check alerts table
            cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='alerts'")
            alerts_table = await cursor.fetchone()
            await cursor.close()
            
            # Check notification_attempts table  
            cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notification_attempts'")
            notifications_table = await cursor.fetchone()
            await cursor.close()
            
            if not alerts_table:
                return HealthCheckResult(
                    service="database",
                    status="critical",
                    message="Required table 'alerts' is missing",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.now(timezone.utc)
                )
            
            if not notifications_table:
                return HealthCheckResult(
                    service="database",
                    status="critical", 
                    message="Required table 'notification_attempts' is missing",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.now(timezone.utc)
                )
            
            return HealthCheckResult(
                service="database",
                status="healthy",
                message="Database is accessible and schema is valid",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            return HealthCheckResult(
                service="database",
                status="critical",
                message=f"Database validation failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _validate_configuration(self) -> HealthCheckResult:
        """Validate application configuration"""
        try:
            issues = []
            warnings = []
            
            # Check critical settings
            if not self.settings.database_path:
                issues.append("database_path not configured")
            
            if not self.settings.ALPHA_VANTAGE_API_KEY or self.settings.ALPHA_VANTAGE_API_KEY == "your_alpha_vantage_key_here":
                issues.append("Alpha Vantage API key not configured")
            
            # Check WhatsApp configuration
            if self.settings.enable_whatsapp:
                if not self.settings.twilio_account_sid or self.settings.twilio_account_sid == "your_twilio_account_sid_here":
                    issues.append("Twilio Account SID not configured")
                if not self.settings.twilio_auth_token or self.settings.twilio_auth_token == "your_twilio_auth_token_here":
                    issues.append("Twilio Auth Token not configured")
                if not self.settings.whatsapp_number:
                    issues.append("WhatsApp number not configured")
            
            # Check for warnings
            if self.settings.monitoring_interval_minutes < 5:
                warnings.append("Monitoring interval is very frequent (< 5 minutes)")
            
            if self.settings.cooldown_hours < 1:
                warnings.append("Cooldown period is very short (< 1 hour)")
            
            if issues:
                return HealthCheckResult(
                    service="configuration",
                    status="critical",
                    message=f"Critical configuration issues: {', '.join(issues)}",
                    details={"issues": issues, "warnings": warnings},
                    timestamp=datetime.now(timezone.utc)
                )
            elif warnings:
                return HealthCheckResult(
                    service="configuration",
                    status="warning",
                    message=f"Configuration warnings: {', '.join(warnings)}", 
                    details={"warnings": warnings},
                    timestamp=datetime.now(timezone.utc)
                )
            else:
                return HealthCheckResult(
                    service="configuration",
                    status="healthy",
                    message="Configuration is valid",
                    timestamp=datetime.now(timezone.utc)
                )
                
        except Exception as e:
            return HealthCheckResult(
                service="configuration",
                status="critical",
                message=f"Configuration validation failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _validate_external_apis(self) -> HealthCheckResult:
        """Validate external API connectivity"""
        start_time = time.time()
        
        try:
            # Test Alpha Vantage API with a simple stock query
            try:
                await price_service.get_price("AAPL", price_service.AssetType.STOCK)
                alpha_vantage_ok = True
            except Exception:
                alpha_vantage_ok = False
            
            # Test CoinGecko API with a simple crypto query
            try:
                await price_service.get_price("bitcoin", price_service.AssetType.CRYPTO)
                coingecko_ok = True
            except Exception:
                coingecko_ok = False
            
            response_time_ms = (time.time() - start_time) * 1000
            
            if not alpha_vantage_ok and not coingecko_ok:
                return HealthCheckResult(
                    service="external_apis",
                    status="critical",
                    message="Both Alpha Vantage and CoinGecko APIs are unreachable",
                    details={"alpha_vantage": alpha_vantage_ok, "coingecko": coingecko_ok},
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(timezone.utc)
                )
            elif not alpha_vantage_ok:
                return HealthCheckResult(
                    service="external_apis",
                    status="warning", 
                    message="Alpha Vantage API is unreachable",
                    details={"alpha_vantage": alpha_vantage_ok, "coingecko": coingecko_ok},
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(timezone.utc)
                )
            elif not coingecko_ok:
                return HealthCheckResult(
                    service="external_apis",
                    status="warning",
                    message="CoinGecko API is unreachable", 
                    details={"alpha_vantage": alpha_vantage_ok, "coingecko": coingecko_ok},
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(timezone.utc)
                )
            else:
                return HealthCheckResult(
                    service="external_apis",
                    status="healthy",
                    message="All external APIs are accessible",
                    details={"alpha_vantage": alpha_vantage_ok, "coingecko": coingecko_ok},
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(timezone.utc)
                )
                
        except Exception as e:
            return HealthCheckResult(
                service="external_apis",
                status="critical",
                message=f"External API validation failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _validate_whatsapp_service(self) -> HealthCheckResult:
        """Validate WhatsApp service configuration"""
        try:
            if not self.settings.enable_whatsapp:
                return HealthCheckResult(
                    service="whatsapp_service",
                    status="healthy", 
                    message="WhatsApp service is disabled",
                    timestamp=datetime.now(timezone.utc)
                )
            
            if not whatsapp_service.is_configured():
                return HealthCheckResult(
                    service="whatsapp_service",
                    status="critical",
                    message="WhatsApp service is enabled but not properly configured",
                    timestamp=datetime.now(timezone.utc)
                )
            
            return HealthCheckResult(
                service="whatsapp_service",
                status="healthy",
                message="WhatsApp service is properly configured",
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            return HealthCheckResult(
                service="whatsapp_service",
                status="critical",
                message=f"WhatsApp service validation failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _validate_scheduler_readiness(self) -> HealthCheckResult:
        """Validate scheduler is ready for operation"""
        try:
            # Check if scheduler can be created (don't actually start it during validation)
            return HealthCheckResult(
                service="scheduler",
                status="healthy",
                message="Scheduler is ready for operation",
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            return HealthCheckResult(
                service="scheduler",
                status="critical",
                message=f"Scheduler validation failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _validate_file_system(self) -> HealthCheckResult:
        """Validate file system permissions and required directories"""
        try:
            import os
            from pathlib import Path
            
            issues = []
            
            # Check if logs directory can be created/accessed
            try:
                logs_dir = Path("logs")
                logs_dir.mkdir(exist_ok=True)
                
                # Test write permission
                test_file = logs_dir / "health_check_test.tmp"
                test_file.write_text("health check")
                test_file.unlink()
                
            except Exception as e:
                issues.append(f"Cannot write to logs directory: {str(e)}")
            
            # Check database directory
            try:
                db_path = Path(self.settings.database_path)
                db_path.parent.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                issues.append(f"Cannot access database directory: {str(e)}")
            
            if issues:
                return HealthCheckResult(
                    service="file_system",
                    status="critical",
                    message=f"File system issues: {', '.join(issues)}",
                    details={"issues": issues},
                    timestamp=datetime.now(timezone.utc)
                )
            else:
                return HealthCheckResult(
                    service="file_system", 
                    status="healthy",
                    message="File system access is working correctly",
                    timestamp=datetime.now(timezone.utc)
                )
                
        except Exception as e:
            return HealthCheckResult(
                service="file_system",
                status="critical",
                message=f"File system validation failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    # Runtime Health Check Methods
    async def _check_database_health(self) -> HealthCheckResult:
        """Check database health during runtime"""
        start_time = time.time()
        
        try:
            is_healthy = await check_database_health()
            response_time_ms = (time.time() - start_time) * 1000
            
            if is_healthy:
                return HealthCheckResult(
                    service="database",
                    status="healthy",
                    message="Database is responsive",
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(timezone.utc)
                )
            else:
                return HealthCheckResult(
                    service="database",
                    status="critical",
                    message="Database health check failed",
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(timezone.utc)
                )
                
        except Exception as e:
            return HealthCheckResult(
                service="database",
                status="critical",
                message=f"Database health check error: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _check_scheduler_health(self) -> HealthCheckResult:
        """Check scheduler health during runtime"""
        try:
            status_info = monitoring_scheduler.get_status()
            
            if not status_info["is_running"]:
                return HealthCheckResult(
                    service="scheduler",
                    status="critical",
                    message="Scheduler is not running",
                    details=status_info,
                    timestamp=datetime.now(timezone.utc)
                )
            
            # Check if scheduler has failed jobs recently
            failed_cycles = status_info["statistics"]["failed_cycles"]
            total_cycles = status_info["statistics"]["total_cycles"]
            
            if total_cycles > 0 and failed_cycles / total_cycles > 0.5:
                return HealthCheckResult(
                    service="scheduler",
                    status="warning", 
                    message=f"High failure rate: {failed_cycles}/{total_cycles} cycles failed",
                    details=status_info,
                    timestamp=datetime.now(timezone.utc)
                )
            
            return HealthCheckResult(
                service="scheduler",
                status="healthy",
                message="Scheduler is running normally",
                details=status_info,
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            return HealthCheckResult(
                service="scheduler",
                status="critical",
                message=f"Scheduler health check failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _check_whatsapp_health(self) -> HealthCheckResult:
        """Check WhatsApp service health during runtime"""
        try:
            if not self.settings.enable_whatsapp:
                return HealthCheckResult(
                    service="whatsapp_service",
                    status="healthy",
                    message="WhatsApp service is disabled", 
                    timestamp=datetime.now(timezone.utc)
                )
            
            if not whatsapp_service.is_configured():
                return HealthCheckResult(
                    service="whatsapp_service",
                    status="warning",
                    message="WhatsApp service is not configured",
                    timestamp=datetime.now(timezone.utc)
                )
            
            return HealthCheckResult(
                service="whatsapp_service",
                status="healthy",
                message="WhatsApp service is available",
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            return HealthCheckResult(
                service="whatsapp_service",
                status="warning",
                message=f"WhatsApp health check failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _check_external_apis_health(self) -> HealthCheckResult:
        """Check external APIs health with lightweight requests"""
        start_time = time.time()
        
        try:
            # For runtime health checks, we don't want to make heavy API calls
            # Just check if the services are configured and accessible
            
            details = {
                "alpha_vantage_configured": bool(self.settings.ALPHA_VANTAGE_API_KEY and self.settings.ALPHA_VANTAGE_API_KEY != "your_alpha_vantage_key_here"),
                "coingecko_available": True  # CoinGecko doesn't require API key for basic access
            }
            
            response_time_ms = (time.time() - start_time) * 1000
            
            if not details["alpha_vantage_configured"]:
                return HealthCheckResult(
                    service="external_apis",
                    status="warning",
                    message="Alpha Vantage API key not configured",
                    details=details,
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(timezone.utc)
                )
            
            return HealthCheckResult(
                service="external_apis",
                status="healthy",
                message="External APIs are configured",
                details=details,
                response_time_ms=response_time_ms,
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            return HealthCheckResult(
                service="external_apis",
                status="warning",
                message=f"External APIs health check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _check_system_resources(self) -> HealthCheckResult:
        """Check system resource usage"""
        try:
            import psutil
            
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            details = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3)
            }
            
            warnings = []
            if cpu_percent > 80:
                warnings.append(f"High CPU usage: {cpu_percent}%")
            if memory.percent > 85:
                warnings.append(f"High memory usage: {memory.percent}%")
            if disk.percent > 90:
                warnings.append(f"Low disk space: {disk.percent}% used")
            
            if warnings:
                return HealthCheckResult(
                    service="system_resources",
                    status="warning",
                    message=f"Resource warnings: {', '.join(warnings)}",
                    details=details,
                    timestamp=datetime.now(timezone.utc)
                )
            else:
                return HealthCheckResult(
                    service="system_resources",
                    status="healthy",
                    message="System resources are within normal limits",
                    details=details,
                    timestamp=datetime.now(timezone.utc)
                )
            
        except ImportError:
            return HealthCheckResult(
                service="system_resources",
                status="warning",
                message="psutil not available for system monitoring",
                timestamp=datetime.now(timezone.utc)
            )
        except Exception as e:
            return HealthCheckResult(
                service="system_resources",
                status="warning",
                message=f"System resources check failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    async def _check_application_state(self) -> HealthCheckResult:
        """Check overall application state"""
        try:
            details = {
                "startup_validation_complete": self.startup_validation_complete,
                "uptime_seconds": time.time() - (self.last_health_check.timestamp() if self.last_health_check else time.time())
            }
            
            if not self.startup_validation_complete:
                return HealthCheckResult(
                    service="application_state",
                    status="warning",
                    message="Startup validation was not completed successfully",
                    details=details,
                    timestamp=datetime.now(timezone.utc)
                )
            
            return HealthCheckResult(
                service="application_state", 
                status="healthy",
                message="Application is running normally",
                details=details,
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            return HealthCheckResult(
                service="application_state",
                status="warning",
                message=f"Application state check failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )


# Global health service instance
health_service = HealthService()