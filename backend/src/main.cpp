
#include <iostream>
#include <string>
#include <sstream>
#include <iomanip>
#include <functional>
#include <cctype>

#include "httplib.h"
#include <libpq-fe.h>

std::string escapeJson(const std::string& text)
{
    std::string result;

    for (unsigned char c : text)
    {
        switch (c)
        {
            case '"':  result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            case '\b': result += "\\b"; break;
            case '\f': result += "\\f"; break;
            default:
                if (c < 0x20)
                    result += ' ';
                else
                    result += static_cast<char>(c);
        }
    }

    return result;
}

std::string simpleHash(const std::string& password)
{
    std::hash<std::string> hasher;
    std::stringstream ss;
    ss << std::hex << hasher(password);
    return ss.str();
}

std::string getJsonValue(
    const std::string& json,
    const std::string& key)
{
    std::string searchKey = "\"" + key + "\"";
    size_t keyPos = json.find(searchKey);

    if (keyPos == std::string::npos)
        return "";

    size_t colonPos = json.find(':', keyPos + searchKey.length());

    if (colonPos == std::string::npos)
        return "";

    size_t start = colonPos + 1;

    while (start < json.length() &&
           std::isspace(static_cast<unsigned char>(json[start])))
        start++;

    if (start >= json.length())
        return "";

    if (json[start] == '"')
    {
        start++;
        std::string result;
        bool escaped = false;

        for (size_t i = start; i < json.length(); i++)
        {
            char c = json[i];

            if (escaped)
            {
                switch (c)
                {
                    case 'n': result += '\n'; break;
                    case 'r': result += '\r'; break;
                    case 't': result += '\t'; break;
                    case 'b': result += '\b'; break;
                    case 'f': result += '\f'; break;
                    default: result += c; break;
                }

                escaped = false;
            }
            else if (c == '\\')
                escaped = true;
            else if (c == '"')
                return result;
            else
                result += c;
        }

        return "";
    }

    size_t end = start;

    while (end < json.length() &&
           json[end] != ',' &&
           json[end] != '}' &&
           json[end] != ']')
        end++;

    std::string result = json.substr(start, end - start);

    while (!result.empty() &&
           std::isspace(static_cast<unsigned char>(result.back())))
        result.pop_back();

    return result;
}

int main()
{
    httplib::Server server;

    const char* connectionInfo =
        "host=localhost "
        "port=5432 "
        "dbname=jai_mart "
        "user=postgres "
        "password=jaishriram";

    PGconn* db = PQconnectdb(connectionInfo);

    if (PQstatus(db) != CONNECTION_OK)
    {
        std::cout << "PostgreSQL Connection Failed!\n"
                  << PQerrorMessage(db) << std::endl;

        PQfinish(db);
        return 1;
    }

    std::cout << "PostgreSQL Connected Successfully!" << std::endl;

    server.set_pre_routing_handler(
        [](const httplib::Request& req, httplib::Response& res)
        {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_header(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS");
            res.set_header(
                "Access-Control-Allow-Headers", "Content-Type");

            if (req.method == "OPTIONS")
            {
                res.status = 200;
                return httplib::Server::HandlerResponse::Handled;
            }

            return httplib::Server::HandlerResponse::Unhandled;
        });

    // HOME

    server.Get("/", [](const httplib::Request&, httplib::Response& res)
    {
        res.set_content("Jai Mart Backend is Online!", "text/plain");
    });

    // REGISTER

    server.Post("/api/register",
        [&db](const httplib::Request& req, httplib::Response& res)
    {
        std::string name = req.get_param_value("name");
        std::string email = req.get_param_value("email");
        std::string phone = req.get_param_value("phone");
        std::string password = req.get_param_value("password");

        if (name.empty() || email.empty() || password.empty())
        {
            res.status = 400;
            res.set_content(
                R"({"success":false,"message":"All required fields are needed"})",
                "application/json");
            return;
        }

        std::string hashedPassword = simpleHash(password);

        const char* values[4] = {
            name.c_str(), email.c_str(), phone.c_str(),
            hashedPassword.c_str()
        };

        PGresult* result = PQexecParams(
            db,
            "INSERT INTO users (name,email,phone,password_hash) "
            "VALUES ($1,$2,$3,$4)",
            4, nullptr, values, nullptr, nullptr, 0);

        if (PQresultStatus(result) != PGRES_COMMAND_OK)
        {
            std::cout << "Register error: "
                      << PQerrorMessage(db) << std::endl;

            PQclear(result);
            res.status = 400;
            res.set_content(
                R"({"success":false,"message":"Email may already exist or database error"})",
                "application/json");
            return;
        }

        PQclear(result);
        res.set_content(
            R"({"success":true,"message":"Account created successfully"})",
            "application/json");
    });

    // LOGIN

    server.Post("/api/login",
        [&db](const httplib::Request& req, httplib::Response& res)
    {
        std::string email = req.get_param_value("email");
        std::string password = req.get_param_value("password");

        if (email.empty() || password.empty())
        {
            res.status = 400;
            res.set_content(
                R"({"success":false,"message":"Email and password are required"})",
                "application/json");
            return;
        }

        std::string hashedPassword = simpleHash(password);

        const char* values[2] = {
            email.c_str(), hashedPassword.c_str()
        };

        PGresult* result = PQexecParams(
            db,
            "SELECT id,name,email,phone FROM users "
            "WHERE LOWER(email)=LOWER($1) AND password_hash=$2",
            2, nullptr, values, nullptr, nullptr, 0);

        if (PQresultStatus(result) != PGRES_TUPLES_OK)
        {
            PQclear(result);
            res.status = 500;
            res.set_content(
                R"({"success":false,"message":"Database error"})",
                "application/json");
            return;
        }

        if (PQntuples(result) == 0)
        {
            PQclear(result);
            res.status = 401;
            res.set_content(
                R"({"success":false,"message":"Invalid email or password"})",
                "application/json");
            return;
        }

        std::string id = PQgetvalue(result, 0, 0);
        std::string name = PQgetvalue(result, 0, 1);
        std::string userEmail = PQgetvalue(result, 0, 2);
        std::string phone = PQgetvalue(result, 0, 3);

        PQclear(result);

        std::string response =
            "{\"success\":true,\"message\":\"Login successful\","
            "\"user\":{\"id\":" + id +
            ",\"name\":\"" + escapeJson(name) +
            "\",\"email\":\"" + escapeJson(userEmail) +
            "\",\"phone\":\"" + escapeJson(phone) + "\"}}";

        res.set_content(response, "application/json");
    });

    // GET PRODUCTS FROM POSTGRESQL

    server.Get("/api/products",
        [&db](const httplib::Request&, httplib::Response& res)
    {
        PGresult* result = PQexec(
            db,
            "SELECT id,name,price,COALESCE(quantity,0),"
            "COALESCE(category,''),COALESCE(description,''),"
            "COALESCE(image,'') FROM products ORDER BY id");

        if (PQresultStatus(result) != PGRES_TUPLES_OK)
        {
            std::cout << "Products query error: "
                      << PQerrorMessage(db) << std::endl;

            PQclear(result);
            res.status = 500;
            res.set_content(
                R"({"success":false,"message":"Failed to load products"})",
                "application/json");
            return;
        }

        std::string response = "[";

        for (int i = 0; i < PQntuples(result); i++)
        {
            if (i > 0)
                response += ",";

            response += "{";
            response += "\"id\":" + std::string(PQgetvalue(result, i, 0));
            response += ",\"name\":\"" +
                        escapeJson(PQgetvalue(result, i, 1)) + "\"";
            response += ",\"price\":" + std::string(PQgetvalue(result, i, 2));
            response += ",\"quantity\":" +
                        std::string(PQgetvalue(result, i, 3));
            response += ",\"category\":\"" +
                        escapeJson(PQgetvalue(result, i, 4)) + "\"";
            response += ",\"description\":\"" +
                        escapeJson(PQgetvalue(result, i, 5)) + "\"";
            response += ",\"image\":\"" +
                        escapeJson(PQgetvalue(result, i, 6)) + "\"";
            response += "}";
        }

        response += "]";
        PQclear(result);
        res.set_content(response, "application/json");
    });

    // ADD PRODUCT

    server.Post("/api/products",
        [&db](const httplib::Request& req, httplib::Response& res)
    {
        std::string name = getJsonValue(req.body, "name");
        std::string description = getJsonValue(req.body, "description");
        std::string price = getJsonValue(req.body, "price");
        std::string image = getJsonValue(req.body, "image");
        std::string quantity = getJsonValue(req.body, "quantity");
        std::string category = getJsonValue(req.body, "category");

        if (name.empty() || price.empty())
        {
            res.status = 400;
            res.set_content(
                R"({"success":false,"message":"Product name and price are required"})",
                "application/json");
            return;
        }

        if (quantity.empty())
            quantity = "0";

        const char* values[6] = {
            name.c_str(), description.c_str(), price.c_str(),
            image.c_str(), quantity.c_str(), category.c_str()
        };

        PGresult* result = PQexecParams(
            db,
            "INSERT INTO products "
            "(name,description,price,image,quantity,category) "
            "VALUES ($1,NULLIF($2,''),$3::numeric,NULLIF($4,''),"
            "COALESCE(NULLIF($5,'')::integer,0),NULLIF($6,'')) "
            "RETURNING id",
            6, nullptr, values, nullptr, nullptr, 0);

        if (PQresultStatus(result) != PGRES_TUPLES_OK)
        {
            std::cout << "Add product error: "
                      << PQerrorMessage(db) << std::endl;

            PQclear(result);
            res.status = 400;
            res.set_content(
                R"({"success":false,"message":"Could not add product. Check price, quantity and database values."})",
                "application/json");
            return;
        }

        std::string productId = PQgetvalue(result, 0, 0);
        PQclear(result);

        res.status = 201;
        res.set_content(
            "{\"success\":true,\"message\":\"Product added successfully\","
            "\"id\":" + productId + "}",
            "application/json");
    });

    // DELETE PRODUCT SAFELY
    // If referenced by an order, preserve it and set stock to zero.

    server.Delete(R"(/api/products/(\d+))",
        [&db](const httplib::Request& req, httplib::Response& res)
    {
        std::string productId = req.matches[1].str();
        const char* values[1] = { productId.c_str() };

        PGresult* result = PQexecParams(
            db,
            "DELETE FROM products p "
            "WHERE p.id=$1::integer "
            "AND NOT EXISTS (SELECT 1 FROM order_items oi "
            "WHERE oi.product_id=p.id) RETURNING id",
            1, nullptr, values, nullptr, nullptr, 0);

        if (PQresultStatus(result) != PGRES_TUPLES_OK)
        {
            std::cout << "Delete error: " << PQerrorMessage(db) << std::endl;
            PQclear(result);
            res.status = 500;
            res.set_content(
                R"({"success":false,"message":"Database error while deleting product"})",
                "application/json");
            return;
        }

        if (PQntuples(result) > 0)
        {
            PQclear(result);
            res.set_content(
                R"({"success":true,"deleted":true,"message":"Product deleted successfully"})",
                "application/json");
            return;
        }

        PQclear(result);

        PGresult* updateResult = PQexecParams(
            db,
            "UPDATE products p SET quantity=0 "
            "WHERE p.id=$1::integer "
            "AND EXISTS (SELECT 1 FROM order_items oi "
            "WHERE oi.product_id=p.id) RETURNING id",
            1, nullptr, values, nullptr, nullptr, 0);

        if (PQresultStatus(updateResult) != PGRES_TUPLES_OK)
        {
            PQclear(updateResult);
            res.status = 500;
            res.set_content(
                R"({"success":false,"message":"Could not update product stock"})",
                "application/json");
            return;
        }

        if (PQntuples(updateResult) > 0)
        {
            PQclear(updateResult);
            res.set_content(
                R"({"success":true,"deleted":false,"unavailable":true,"message":"Product has existing orders. It was kept for order history and its stock was set to zero."})",
                "application/json");
            return;
        }

        PQclear(updateResult);
        res.status = 404;
        res.set_content(
            R"({"success":false,"message":"Product not found"})",
            "application/json");
    });

    // PLACE ORDER

    server.Post("/api/orders",
        [&db](const httplib::Request& req, httplib::Response& res)
    {
        std::string userId = getJsonValue(req.body, "user_id");
        std::string totalAmount = getJsonValue(req.body, "total_amount");
        std::string name = getJsonValue(req.body, "name");
        std::string phone = getJsonValue(req.body, "phone");
        std::string address = getJsonValue(req.body, "address");
        std::string city = getJsonValue(req.body, "city");
        std::string pincode = getJsonValue(req.body, "pincode");
        std::string items = getJsonValue(req.body, "items");

        if (userId.empty() || totalAmount.empty() || name.empty() ||
            phone.empty() || address.empty() || city.empty() ||
            pincode.empty() || items.empty())
        {
            res.status = 400;
            res.set_content(
                R"({"success":false,"message":"All order fields are required"})",
                "application/json");
            return;
        }

        PGresult* beginResult = PQexec(db, "BEGIN");

        if (PQresultStatus(beginResult) != PGRES_COMMAND_OK)
        {
            PQclear(beginResult);
            res.status = 500;
            res.set_content(
                R"({"success":false,"message":"Could not start database transaction"})",
                "application/json");
            return;
        }

        PQclear(beginResult);

        const char* orderValues[8] = {
            userId.c_str(), totalAmount.c_str(), name.c_str(),
            phone.c_str(), address.c_str(), city.c_str(),
            pincode.c_str(), "Order Placed"
        };

        PGresult* orderResult = PQexecParams(
            db,
            "INSERT INTO orders "
            "(user_id,total_amount,name,phone,address,city,pincode,status) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
            8, nullptr, orderValues, nullptr, nullptr, 0);

        if (PQresultStatus(orderResult) != PGRES_TUPLES_OK ||
            PQntuples(orderResult) == 0)
        {
            std::string error = PQerrorMessage(db);
            PQclear(orderResult);
            PGresult* rollbackResult = PQexec(db, "ROLLBACK");
            PQclear(rollbackResult);

            std::cout << "Order insert error: " << error << std::endl;

            res.status = 500;
            res.set_content(
                R"({"success":false,"message":"Failed to create order"})",
                "application/json");
            return;
        }

        std::string orderId = PQgetvalue(orderResult, 0, 0);
        PQclear(orderResult);

        // Expected format: 1:1:1499,2:2:999
        // Each item: product_id:quantity:price

        std::stringstream itemStream(items);
        std::string item;
        bool itemError = false;

        while (std::getline(itemStream, item, ','))
        {
            if (item.empty())
                continue;

            std::stringstream valueStream(item);
            std::string productId, quantity, itemPrice;

            if (!std::getline(valueStream, productId, ':') ||
                !std::getline(valueStream, quantity, ':') ||
                !std::getline(valueStream, itemPrice, ':') ||
                productId.empty() || quantity.empty() || itemPrice.empty())
            {
                itemError = true;
                break;
            }

            const char* itemValues[4] = {
                orderId.c_str(), productId.c_str(),
                quantity.c_str(), itemPrice.c_str()
            };

            PGresult* itemResult = PQexecParams(
                db,
                "INSERT INTO order_items "
                "(order_id,product_id,quantity,price) "
                "VALUES ($1,$2,$3,$4)",
                4, nullptr, itemValues, nullptr, nullptr, 0);

            if (PQresultStatus(itemResult) != PGRES_COMMAND_OK)
            {
                std::cout << "Order item error: "
                          << PQerrorMessage(db) << std::endl;

                itemError = true;
                PQclear(itemResult);
                break;
            }

            PQclear(itemResult);
        }

        if (itemError)
        {
            PGresult* rollbackResult = PQexec(db, "ROLLBACK");
            PQclear(rollbackResult);

            res.status = 400;
            res.set_content(
                R"({"success":false,"message":"Invalid order items or database error"})",
                "application/json");
            return;
        }

        PGresult* commitResult = PQexec(db, "COMMIT");

        if (PQresultStatus(commitResult) != PGRES_COMMAND_OK)
        {
            std::string error = PQerrorMessage(db);
            PQclear(commitResult);

            PGresult* rollbackResult = PQexec(db, "ROLLBACK");
            PQclear(rollbackResult);

            std::cout << "Commit error: " << error << std::endl;

            res.status = 500;
            res.set_content(
                R"({"success":false,"message":"Failed to save order"})",
                "application/json");
            return;
        }

        PQclear(commitResult);

        res.set_content(
            "{\"success\":true,\"message\":\"Order placed successfully\","
            "\"order_id\":" + orderId + "}",
            "application/json");
    });

    std::cout << "Jai Mart Backend Started!" << std::endl;
    std::cout << "Server running at http://localhost:8080" << std::endl;

    server.listen("0.0.0.0", 8080);

    PQfinish(db);
    return 0;
}
