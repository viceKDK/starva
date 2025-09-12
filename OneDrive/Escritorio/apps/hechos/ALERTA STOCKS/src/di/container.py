"""
Dependency Injection Container
Implements Service Locator pattern for managing dependencies
"""

from typing import Dict, Any, TypeVar, Type, Callable, Optional
import inspect
from functools import wraps

from ..repositories.alert_repository import AlertRepositoryInterface, SQLiteAlertRepository
from ..services.alert_service_v2 import AlertServiceV2
from ..services.price_service_v2 import PriceServiceV2
from ..providers.alpha_vantage_provider import AlphaVantageProvider
from ..providers.coingecko_provider import CoinGeckoProvider
from ..interfaces.price_provider import PriceProviderInterface

T = TypeVar('T')


class DIContainer:
    """Simple Dependency Injection Container"""
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._singletons: Dict[str, Any] = {}
        self._factories: Dict[str, Callable] = {}
        
    def register_singleton(self, interface: Type[T], implementation: Type[T]) -> None:
        """Register a singleton service"""
        key = interface.__name__
        self._services[key] = implementation
        
    def register_transient(self, interface: Type[T], factory: Callable[[], T]) -> None:
        """Register a transient service with factory"""
        key = interface.__name__
        self._factories[key] = factory
        
    def register_instance(self, interface: Type[T], instance: T) -> None:
        """Register an existing instance"""
        key = interface.__name__
        self._singletons[key] = instance
        
    def get(self, interface: Type[T]) -> T:
        """Get service instance"""
        key = interface.__name__
        
        # Check for existing singleton
        if key in self._singletons:
            return self._singletons[key]
            
        # Check for factory
        if key in self._factories:
            return self._factories[key]()
            
        # Check for registered service
        if key in self._services:
            service_class = self._services[key]
            instance = self._create_instance(service_class)
            self._singletons[key] = instance  # Cache as singleton
            return instance
            
        raise ValueError(f"Service {interface.__name__} not registered")
    
    def _create_instance(self, service_class: Type[T]) -> T:
        """Create instance with dependency injection"""
        sig = inspect.signature(service_class.__init__)
        kwargs = {}
        
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
                
            if param.annotation != inspect.Parameter.empty:
                dependency = self.get(param.annotation)
                kwargs[param_name] = dependency
                
        return service_class(**kwargs)


# Global container instance
container = DIContainer()


def configure_dependencies():
    """Configure all application dependencies"""
    
    # Register repositories
    container.register_singleton(
        AlertRepositoryInterface, 
        SQLiteAlertRepository
    )
    
    # Register services
    container.register_singleton(
        AlertServiceV2,
        AlertServiceV2
    )
    
    # Register price service with its providers
    container.register_singleton(
        PriceServiceV2,
        PriceServiceV2
    )
    
    # Register price providers as factories (they can be created multiple times)
    container.register_transient(
        AlphaVantageProvider,
        lambda: AlphaVantageProvider()
    )
    
    container.register_transient(
        CoinGeckoProvider,
        lambda: CoinGeckoProvider()
    )
    
    # Create PriceService with providers
    providers = [
        AlphaVantageProvider(),
        CoinGeckoProvider()
    ]
    container.register_instance(PriceServiceV2, PriceServiceV2(providers))


def get_service(interface: Type[T]) -> T:
    """Get service from container"""
    return container.get(interface)


def inject(interface: Type[T]):
    """Decorator for dependency injection in route handlers"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            service = get_service(interface)
            return await func(service, *args, **kwargs)
        return wrapper
    return decorator


# Initialize dependencies on module import
configure_dependencies()