from urllib.parse import parse_qs
import logging
import jwt

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from channels.auth import AuthMiddleware
from channels.db import database_sync_to_async
from channels.sessions import CookieMiddleware, SessionMiddleware
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

logger = logging.getLogger(__name__)

JWT_authenticator = JWTAuthentication()
User = get_user_model()

@database_sync_to_async
def get_user(scope):
    """
    Get the user from the token in the query string.
    """
    close_old_connections()
    
    # Try to get token from query string
    query_string = parse_qs(scope['query_string'].decode())
    token = query_string.get('token')
    
    # If no token in query string, try to get from headers
    if not token:
        headers = dict(scope['headers'])
        auth_header = headers.get(b'authorization', b'').decode()
        if auth_header.startswith('Bearer '):
            token = [auth_header.split(' ')[1]]
    
    if not token:
        logger.warning("No token found in WebSocket connection")
        return AnonymousUser()
    
    try:
        # Validate the token
        access_token = AccessToken(token[0])
        user_id = access_token['user_id']
        
        # Get the user
        user = User.objects.get(id=user_id)
        logger.info(f"WebSocket authenticated for user: {user.id}")
        
        return user
    except jwt.ExpiredSignatureError:
        logger.warning("WebSocket token expired")
        return AnonymousUser()
    except (jwt.InvalidTokenError, User.DoesNotExist) as e:
        logger.warning(f"WebSocket authentication failed: {str(e)}")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket authentication: {str(e)}")
        return AnonymousUser()


class TokenAuthMiddleware(AuthMiddleware):
    """
    Custom token auth middleware for Django Channels
    """
    async def resolve_scope(self, scope):
        scope['user']._wrapped = await get_user(scope)


def TokenAuthMiddlewareStack(inner):
    """
    Middleware stack for token authentication with WebSockets
    """
    return CookieMiddleware(SessionMiddleware(TokenAuthMiddleware(inner)))

