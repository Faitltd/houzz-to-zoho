import logging
import sys
from config import LOG_FILE, LOG_LEVEL

def setup_logger():
    """Set up and configure the logger."""
    # Map string log level to logging constants
    log_level_map = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    # Get the numeric log level
    numeric_level = log_level_map.get(LOG_LEVEL.upper(), logging.INFO)
    
    # Configure the root logger
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            # Log to file
            logging.FileHandler(LOG_FILE),
            # Also log to console
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Create a logger for this module
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized at level {LOG_LEVEL}")
    
    return logger

# Create and configure the logger when this module is imported
logger = setup_logger()
