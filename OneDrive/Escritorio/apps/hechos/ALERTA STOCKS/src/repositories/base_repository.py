"""
Base repository interface following SOLID principles
"""

from abc import ABC, abstractmethod
from typing import List, Optional, TypeVar, Generic

T = TypeVar('T')


class BaseRepository(Generic[T], ABC):
    """Base repository interface for common CRUD operations"""
    
    @abstractmethod
    async def create(self, entity_data: dict) -> T:
        """Create a new entity"""
        pass
    
    @abstractmethod
    async def find_by_id(self, entity_id: int) -> Optional[T]:
        """Find entity by ID"""
        pass
    
    @abstractmethod
    async def find_all(self) -> List[T]:
        """Find all entities"""
        pass
    
    @abstractmethod
    async def update(self, entity_id: int, update_data: dict) -> Optional[T]:
        """Update entity by ID"""
        pass
    
    @abstractmethod
    async def delete(self, entity_id: int) -> bool:
        """Delete entity by ID"""
        pass