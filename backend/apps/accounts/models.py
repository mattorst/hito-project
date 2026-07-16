from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    """
    Modelo de usuario del proyecto Hito.

    Actualmente no agrega campos adicionales.
    Se define desde el inicio para permitir
    extenderlo sin migraciones complejas en el futuro.
    """

    pass