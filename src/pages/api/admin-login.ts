export async function POST({ request }: { request: Request }) {
  const formData = await request.formData();
  const password = formData.get('password');
  const redirect = formData.get('redirect') || '/admin';

  // Lee la contraseña desde la variable de entorno
  const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD no está configurada en .env');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/admin-login?error=true'
      }
    });
  }

  if (password === ADMIN_PASSWORD) {
    // Contraseña correcta - redirige autenticado
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirect as string,
        'Set-Cookie': `admin_session=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      }
    });
  }

  // Contraseña incorrecta - vuelve a login con error
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/admin-login?error=true'
    }
  });
}
