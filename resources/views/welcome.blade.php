<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Inventory Management System</title>
        <meta name="csrf-token" content="{{ csrf_token() }}">
    </head>
    <body class="bg-gray-100 min-h-screen">
        <div id="root"></div>

  
  
        <!-- Try original app with error handling -->
        <script>
            window.addEventListener('error', function(e) {
                console.error('Window Error:', e);
                e.preventDefault();
            }, true);

            window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled Promise Rejection:', e);
                e.preventDefault();
            });
        </script>
        <script type="module" src="http://192.168.18.23:3000/resources/js/app.jsx"></script>

      </body>
</html>