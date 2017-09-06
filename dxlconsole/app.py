import logging

from dxlbootstrap.app import Application
from .console import WebConsole

# Configure local logger
logger = logging.getLogger(__name__)


class OpenDxlConsole(Application):
    """
    The "OpenDXL Console" application class.
    """

    #: The name of the "General" section within the application configuration file
    GENERAL_CONFIG_SECTION = "General"
    #: The web server port property
    GENERAL_PORT_CONFIG_PROP = "port"

    def __init__(self, config_dir):
        """
        Constructor parameters:

        :param config_dir: The location of the configuration files for the
            application
        """
        super(OpenDxlConsole, self).__init__(config_dir, "dxlconsole.config")

        self._web_console = None
        self._port = 8080

    @property
    def port(self):
        return self._port

    @property
    def client(self):
        """
        The DXL client used by the application to communicate with the DXL
        fabric
        """
        return self._dxl_client

    @property
    def client_config_path(self):
        return self._dxlclient_config_path

    @property
    def config(self):
        """
        The application configuration (as read from the "dxlconsole.config" file)
        """
        return self._config

    def on_run(self):
        """
        Invoked when the application has started running.
        """
        logger.info("On 'run' callback.")

    def on_load_configuration(self, config):
        """
        Invoked after the application-specific configuration has been loaded

        This callback provides the opportunity for the application to parse
        additional configuration properties.

        :param config: The application configuration
        """
        logger.info("On 'load configuration' callback.")

        # Port
        try:
            self._port = int(config.get(self.GENERAL_CONFIG_SECTION, self.GENERAL_PORT_CONFIG_PROP))
        except Exception:
            pass
        if not self._port:
            raise Exception("Port not found in configuration file: {0}"
                            .format(self._app_config_path))

    def on_dxl_connect(self):
        """
        Invoked after the client associated with the application has connected
        to the DXL fabric.
        """
        logger.info("On 'DXL connect' callback.")

        self._web_console = WebConsole(self)
        self._web_console.start()
