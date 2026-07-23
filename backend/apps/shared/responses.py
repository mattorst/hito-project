from rest_framework.response import Response

def success_response(
    data=None,
    message="Operación realizada correctamente",
    status_code=200,
):
    return Response(
        {
            "success": True,
            "data": data,
            "message": message,
        },
        status=status_code,
    )

def error_response(
    errors=None,
    message="Error en la solicitud",
    status_code=400,
):
    return Response(
        {
            "success": False,
            "errors": errors or {},
            "message": message,
        },
        status=status_code,
    )