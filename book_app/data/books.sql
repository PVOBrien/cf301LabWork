DROP TABLE IF EXISTS books;

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    image VARCHAR(255),
    title VARCHAR(255),
    authors VARCHAR(255),
    description TEXT,
    isbn VARCHAR(255)
)